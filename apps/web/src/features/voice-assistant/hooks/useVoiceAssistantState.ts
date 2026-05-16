"use client";

import { useCallback, useState } from "react";
import type { ParsedMessage } from "../components/MessageItem";

interface PendingConfirmation {
  nurseName: string;
  englishName: string | null;
  shift: string;
  date: string;
}

interface UseVoiceAssistantStateReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  messages: ParsedMessage[];
  setMessages: (messages: ParsedMessage[] | ((prev: ParsedMessage[]) => ParsedMessage[])) => void;
  pendingConfirmation: PendingConfirmation | null;
  setPendingConfirmation: (confirmation: PendingConfirmation | null) => void;
  awaitingResponse: boolean;
  setAwaitingResponse: (awaiting: boolean) => void;
  lastAction: "confirmed" | "cancelled" | null;
  setLastAction: (action: "confirmed" | "cancelled" | null) => void;
}

export function useVoiceAssistantState(): UseVoiceAssistantStateReturn {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [lastAction, setLastAction] = useState<"confirmed" | "cancelled" | null>(null);

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
  };
}