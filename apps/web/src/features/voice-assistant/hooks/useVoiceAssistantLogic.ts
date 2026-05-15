"use client";

import { useCallback, useRef } from "react";
import { parseCommand } from "../utils/commandParser";
import { useConfirmShiftUpdate } from "./useConfirmShiftUpdate";
import type { ParsedMessage } from "../components/MessageItem";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

interface PendingConfirmation {
  nurseName: string;
  englishName: string | null;
  shift: string;
  date: string;
}

interface UseVoiceAssistantLogicProps {
  pendingConfirmation: PendingConfirmation | null;
  setPendingConfirmation: (confirmation: PendingConfirmation | null) => void;
  awaitingResponse: boolean;
  setAwaitingResponse: (awaiting: boolean) => void;
  setLastAction: (action: "confirmed" | "cancelled" | null) => void;
  setMessages: (
    messages: ParsedMessage[] | ((prev: ParsedMessage[]) => ParsedMessage[]),
  ) => void;
}

export function useVoiceAssistantLogic({
  pendingConfirmation,
  setPendingConfirmation,
  awaitingResponse,
  setAwaitingResponse,
  setLastAction,
  setMessages,
}: UseVoiceAssistantLogicProps) {
  const { confirmShiftUpdate } = useConfirmShiftUpdate();
  const { speak, isSpeakingRef } = useSpeechSynthesis();
  const lastActionRef = useRef<"confirmed" | "cancelled" | null>(null);
  const accumulatedDataRef = useRef<{
    shift: string | null;
    date: string | null;
    nurseName: string | null;
    englishName: string | null;
  }>({ shift: null, date: null, nurseName: null, englishName: null });

  const askForMissingFields = useCallback(
    (missingFields: string[]) => {
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
      speak(questions);
    },
    [setMessages, setAwaitingResponse, speak],
  );

  const askForConfirmation = useCallback(
    (nurseName: string, englishName: string | null, shift: string, date: string) => {
      const displayName = englishName ?? nurseName;
      const msg = `Do you want to update ${displayName}'s shift to ${shift} on ${date}? To confirm say yes, to cancel say no.`;
      setPendingConfirmation({ nurseName, englishName, shift, date });
      setMessages((prev) => [
        ...prev,
        {
          raw: msg,
          isSystem: true,
        } as ParsedMessage,
      ]);
      setAwaitingResponse(true);
      speak(msg);
    },
    [setPendingConfirmation, setMessages, setAwaitingResponse, speak],
  );

  const processMessage = useCallback(
    (text: string) => {
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
            {
              raw: "Cancelled. How else can I help?",
              isSystem: true,
            } as ParsedMessage,
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
        speak("Please say yes or no to confirm");
        return;
      }

      const parsed = parseCommand(text);

      if (parsed.shift || parsed.date || parsed.nurseName) {
        setMessages((prev) => [
          ...prev,
          {
            raw: text,
            showRaw: false,
            command: parsed,
          },
        ]);
      }

      // When awaiting response, accumulate parsed data
      let finalParsed = parsed;
      if (awaitingResponse) {
        accumulatedDataRef.current = {
          shift: parsed.shift ?? accumulatedDataRef.current.shift,
          date: parsed.date ?? accumulatedDataRef.current.date,
          nurseName: parsed.nurseName ?? accumulatedDataRef.current.nurseName,
          englishName: parsed.englishName ?? accumulatedDataRef.current.englishName,
        };
        finalParsed = {
          shift: accumulatedDataRef.current.shift,
          date: accumulatedDataRef.current.date,
          nurseName: accumulatedDataRef.current.nurseName,
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
          englishName: null,
        };
        askForConfirmation(
          finalParsed.nurseName,
          finalParsed.englishName,
          finalParsed.shift,
          finalParsed.date,
        );
      } else if (finalParsed.missingFields.length > 0) {
        if (awaitingResponse) {
          return;
        }
        askForMissingFields(finalParsed.missingFields);
      } else {
        setAwaitingResponse(false);
      }
    },
    [
      pendingConfirmation,
      confirmShiftUpdate,
      setPendingConfirmation,
      setAwaitingResponse,
      setLastAction,
      setMessages,
      askForConfirmation,
      askForMissingFields,
      awaitingResponse,
      speak,
    ],
  );

  return {
    processMessage,
    speak,
    isSpeakingRef,
  };
}
