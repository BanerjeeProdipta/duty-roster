"use client";

import { useCallback, useState } from "react";
import type { ParsedMessage } from "../components/MessageItem";

interface PendingConfirmation {
	nurseName: string;
	nurseId: string | null;
	englishName: string | null;
	shift: string;
	date: string;
}

interface UseAIAssistantStateReturn {
	open: boolean;
	setOpen: (open: boolean) => void;
	toggleOpen: () => void;
	inputValue: string;
	setInputValue: (value: string) => void;
	messages: ParsedMessage[];
	setMessages: (
		messages: ParsedMessage[] | ((prev: ParsedMessage[]) => ParsedMessage[]),
	) => void;
	pendingConfirmation: PendingConfirmation | null;
	setPendingConfirmation: (confirmation: PendingConfirmation | null) => void;
	awaitingResponse: boolean;
	setAwaitingResponse: (awaiting: boolean) => void;
	lastAction: "confirmed" | "cancelled" | null;
	setLastAction: (action: "confirmed" | "cancelled" | null) => void;
	isProcessing: boolean;
	setIsProcessing: (processing: boolean) => void;
}

export function useAIAssistantState(): UseAIAssistantStateReturn {
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [messages, setMessages] = useState<ParsedMessage[]>([]);
	const [pendingConfirmation, setPendingConfirmation] =
		useState<PendingConfirmation | null>(null);
	const [awaitingResponse, setAwaitingResponse] = useState(false);
	const [lastAction, setLastAction] = useState<
		"confirmed" | "cancelled" | null
	>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const toggleOpen = useCallback(() => {
		setOpen((prev) => !prev);
	}, []);

	return {
		open,
		setOpen,
		toggleOpen,
		inputValue,
		setInputValue,
		messages,
		setMessages,
		pendingConfirmation,
		setPendingConfirmation,
		awaitingResponse,
		setAwaitingResponse,
		lastAction,
		setLastAction,
		isProcessing,
		setIsProcessing,
	};
}
