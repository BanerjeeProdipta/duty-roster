"use client";

import type { NameRecord } from "@Duty-Roster/ai-parser";
import {
	resolveBengaliToEnglish,
	resolveNamesInText,
} from "@Duty-Roster/ai-parser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";
import type { ParsedMessage } from "../components/MessageItem";
import { parseCommand } from "../utils/commandParser";
import { useConfirmShiftUpdate } from "./useConfirmShiftUpdate";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

const STT_CORRECTIONS: Record<string, string> = {
	schiff: "shift",
	schift: "shift",
	sheip: "shift",
	sheap: "shift",
	sheep: "shift",
	chift: "shift",
	firday: "friday",
	fourth: "who's",
	kinnear: "can you",
	"can u s": "can you set",
	"can u c": "can you set",
	"to eat thing": "to evening",
	"eat thing": "evening",
	"the thing": "evening",
};

const _SHIFT_WORDS_SET = new Set(["morning", "evening", "night", "off"]);

function normalizeText(text: string): string {
	let result = text.toLowerCase();
	for (const [bad, good] of Object.entries(STT_CORRECTIONS)) {
		result = result.replace(new RegExp(`\\b${bad}\\b`, "gi"), good);
	}
	return result;
}

const AGENT_URL =
	process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, "") ??
	"http://localhost:3000";

interface PendingConfirmation {
	nurseName: string;
	nurseId: string | null;
	englishName: string | null;
	shift: string;
	date: string;
}

interface UseAIAssistantLogicProps {
	messages: ParsedMessage[];
	pendingConfirmation: PendingConfirmation | null;
	setPendingConfirmation: (confirmation: PendingConfirmation | null) => void;
	awaitingResponse: boolean;
	setAwaitingResponse: (awaiting: boolean) => void;
	setLastAction: (action: "confirmed" | "cancelled" | null) => void;
	setMessages: (
		messages: ParsedMessage[] | ((prev: ParsedMessage[]) => ParsedMessage[]),
	) => void;
	setIsProcessing: (processing: boolean) => void;
}

export function useAIAssistantLogic({
	messages,
	pendingConfirmation,
	setPendingConfirmation,
	awaitingResponse,
	setAwaitingResponse,
	setLastAction,
	setMessages,
	setIsProcessing,
}: UseAIAssistantLogicProps) {
	const { confirmShiftUpdate } = useConfirmShiftUpdate();
	const { speak: speakWithTTS, isSpeakingRef } = useSpeechSynthesis();
	const lastActionRef = useRef<"confirmed" | "cancelled" | null>(null);
	const lastSpeechEndedRef = useRef<number>(0);
	const accumulatedDataRef = useRef<{
		shift: string | null;
		date: string | null;
		nurseName: string | null;
		nurseId: string | null;
		englishName: string | null;
	}>({
		shift: null,
		date: null,
		nurseName: null,
		nurseId: null,
		englishName: null,
	});

	const queryClient = useQueryClient();

	const { data: nurses = [] } = useQuery({
		queryKey: ["nurses"],
		queryFn: () => trpcClient.roster.getNurses.query(),
		staleTime: 5 * 60 * 1000,
	});

	const speakSafely = useCallback(
		async (text: string) => {
			const resolved = resolveBengaliToEnglish(text);
			await speakWithTTS(resolved);
			lastSpeechEndedRef.current = Date.now();
		},
		[speakWithTTS],
	);

	const askForMissingFields = useCallback(
		(missingFields: string[], skipTTS?: boolean) => {
			const fieldMap: Record<string, string> = {
				nurse: "Which nurse?",
				shift: "Which shift?",
				date: "Which date?",
			};
			const questions = missingFields.map((f) => fieldMap[f]).join(" ");
			setMessages((prev) => [
				...prev,
				{ raw: questions, isSystem: true } as ParsedMessage,
			]);
			setAwaitingResponse(true);
			if (!skipTTS) speakSafely(questions);
		},
		[setMessages, setAwaitingResponse, speakSafely],
	);

	const askForConfirmation = useCallback(
		(
			nurseName: string,
			nurseId: string | null,
			englishName: string | null,
			shift: string,
			date: string,
			skipTTS?: boolean,
		) => {
			const displayName = englishName ?? nurseName;
			const msg = `Do you want to update ${displayName}'s shift to ${shift} on ${date}? To confirm say yes, to cancel say no.`;
			setPendingConfirmation({ nurseName, nurseId, englishName, shift, date });
			setMessages((prev) => [
				...prev,
				{
					raw: msg,
					isSystem: true,
				} as ParsedMessage,
			]);
			setAwaitingResponse(true);
			if (!skipTTS) speakSafely(msg);
		},
		[setPendingConfirmation, setMessages, setAwaitingResponse, speakSafely],
	);

	const queryAgent = useCallback(
		async (
			text: string,
			history?: { role: string; content: string }[],
		): Promise<string | null> => {
			try {
				const res = await fetch(`${AGENT_URL}/api/agent`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text, history }),
				});
				if (!res.ok) return null;
				const data = await res.json();
				return data.response ?? null;
			} catch {
				return null;
			}
		},
		[],
	);

	const processMessage = useCallback(
		(text: string, options?: { skipTTS?: boolean }) => {
			const skipTTS = options?.skipTTS ?? false;
			setMessages(
				(prev) => [...prev, { raw: text, isUser: true }] as ParsedMessage[],
			);
			console.log("[AILogic] processMessage:", text, { skipTTS });
			const lowerText = text.toLowerCase();

			if (pendingConfirmation) {
				if (
					lowerText.includes("yes") ||
					lowerText.includes("confirm") ||
					lowerText.includes("ok") ||
					lowerText.includes("sure") ||
					lowerText === "y"
				) {
					confirmShiftUpdate(pendingConfirmation);
					setPendingConfirmation(null);
					setAwaitingResponse(false);
					lastActionRef.current = "confirmed";
					setLastAction("confirmed");
					return;
				}
				if (
					lowerText.includes("no") ||
					lowerText.includes("cancel") ||
					lowerText.includes("not")
				) {
					setMessages((prev) => [
						...prev,
						{ raw: "Cancelled.", isSystem: true } as ParsedMessage,
					]);
					setPendingConfirmation(null);
					setAwaitingResponse(false);
					lastActionRef.current = "cancelled";
					setLastAction("cancelled");
					return;
				}
				setMessages((prev) => [
					...prev,
					{
						raw: "Please say yes or no to confirm",
						isSystem: true,
					} as ParsedMessage,
				]);
				if (!skipTTS) speakSafely("Please say yes or no to confirm");
				return;
			}

			// Normalize STT errors and resolve English names to Bengali
			const normalized = normalizeText(text);
			const agentText = resolveNamesInText(normalized);

			// Map history for agent
			const history = messages.map((m) => ({
				role: m.isUser ? "user" : "assistant",
				content: m.raw,
			}));

			setIsProcessing(true);

			// Try agent API first
			queryAgent(agentText, history).then((agentResponse) => {
				setIsProcessing(false);
				if (agentResponse) {
					setMessages((prev) => [
						...prev,
						{ raw: agentResponse, isSystem: true } as ParsedMessage,
					]);
					setAwaitingResponse(false);
					if (!skipTTS) speakSafely(agentResponse);
					const dateMatch = agentResponse.match(/\d{4}-\d{2}-\d{2}/);
					if (dateMatch) {
						const [yearStr, monthStr] = dateMatch[0].split("-");
						const year = Number.parseInt(yearStr, 10);
						const month = Number.parseInt(monthStr, 10);
						queryClient.invalidateQueries({
							queryKey: QUERY_KEYS.schedules(year, month),
						});
					}
					return;
				}

				// Fall back to rule-based parser
				const parsed = parseCommand(text, nurses);
				console.log(
					"[AILogic] parsed command (fallback):",
					JSON.stringify(parsed),
				);

				let finalParsed = parsed;
				if (awaitingResponse) {
					accumulatedDataRef.current = {
						shift: parsed.shift ?? accumulatedDataRef.current.shift,
						date: parsed.date ?? accumulatedDataRef.current.date,
						nurseName: parsed.nurseName ?? accumulatedDataRef.current.nurseName,
						nurseId: parsed.nurseId ?? accumulatedDataRef.current.nurseId,
						englishName:
							parsed.englishName ?? accumulatedDataRef.current.englishName,
					};
					finalParsed = {
						shift: accumulatedDataRef.current.shift,
						date: accumulatedDataRef.current.date,
						nurseName: accumulatedDataRef.current.nurseName,
						nurseId: accumulatedDataRef.current.nurseId,
						englishName: accumulatedDataRef.current.englishName,
						action:
							accumulatedDataRef.current.shift &&
							accumulatedDataRef.current.date &&
							accumulatedDataRef.current.nurseName
								? "update"
								: null,
						missingFields: [
							...(accumulatedDataRef.current.shift ? [] : ["shift"]),
							...(accumulatedDataRef.current.date ? [] : ["date"]),
							...(accumulatedDataRef.current.nurseName ? [] : ["nurse"]),
						],
					};
				} else {
					accumulatedDataRef.current = {
						shift: parsed.shift,
						date: parsed.date,
						nurseName: parsed.nurseName,
						nurseId: parsed.nurseId,
						englishName: parsed.englishName,
					};
				}

				if (
					finalParsed.action === "update" &&
					finalParsed.nurseName &&
					finalParsed.shift &&
					finalParsed.date
				) {
					setAwaitingResponse(false);
					accumulatedDataRef.current = {
						shift: null,
						date: null,
						nurseName: null,
						nurseId: null,
						englishName: null,
					};
					askForConfirmation(
						finalParsed.nurseName,
						finalParsed.nurseId,
						finalParsed.englishName,
						finalParsed.shift,
						finalParsed.date,
						skipTTS,
					);
				} else if (finalParsed.missingFields.length > 0) {
					if (awaitingResponse) return;

					// Detect query intents so we don't treat "who's on morning shift?" as a set command
					const lower = text.toLowerCase();
					const isQuery =
						/^(tell me|show me|list|who|what|when|how|is|are|do|does|can you tell)/.test(
							lower,
						) || /\b(who|what|which|list|show)\b/.test(lower);

					if (isQuery) {
						const msg =
							"I can look up shift information for you, but I need the agent to be available. Please try again.";
						setMessages(
							(prev) =>
								[...prev, { raw: msg, isSystem: true }] as ParsedMessage[],
						);
						setAwaitingResponse(false);
						if (!skipTTS) speakSafely(msg);
						return;
					}

					askForMissingFields(finalParsed.missingFields, skipTTS);
				} else {
					setAwaitingResponse(false);
				}
			});
		},
		[
			messages,
			pendingConfirmation,
			confirmShiftUpdate,
			setPendingConfirmation,
			setAwaitingResponse,
			setLastAction,
			setMessages,
			setIsProcessing,
			askForConfirmation,
			askForMissingFields,
			awaitingResponse,
			speakSafely,
			queryAgent,
			queryClient,
			nurses,
		],
	);

	return {
		processMessage,
		speak: speakSafely,
		isSpeakingRef,
		lastSpeechEndedRef,
	};
}
