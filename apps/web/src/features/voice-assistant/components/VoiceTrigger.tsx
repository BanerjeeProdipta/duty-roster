"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bot, X } from "lucide-react";
import { useVoice } from "@/features/voice-assistant/hooks/useVoice";
import { useVoiceAssistantState } from "@/features/voice-assistant/hooks/useVoiceAssistantState";
import { useVoiceAssistantLogic } from "@/features/voice-assistant/hooks/useVoiceAssistantLogic";
import { VoicePopover } from "./VoicePopover";
import type { ParsedMessage } from "./MessageItem";

export function VoiceTrigger() {
  const { transcript, isListening, levels, start, stop, ready } = useVoice();

  const {
    open,
    setOpen,
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
  } = useVoiceAssistantState();

  const { processMessage, speak, isSpeakingRef } = useVoiceAssistantLogic({
    pendingConfirmation,
    setPendingConfirmation,
    awaitingResponse,
    setAwaitingResponse,
    setLastAction,
    setMessages,
  });

  const lastProcessedTranscriptRef = useRef("");
  const transcriptSkippedWhileSpeakingRef = useRef(false);

  const toggleMic = useCallback(() => {
    isListening ? stop() : start();
  }, [isListening, stop, start]);

  const handleClose = useCallback(() => {
    stop();
    setOpen(false);
    setMessages([]);
    setInputValue("");
    setPendingConfirmation(null);
    setAwaitingResponse(false);
  }, [
    stop,
    setOpen,
    setMessages,
    setInputValue,
    setPendingConfirmation,
    setAwaitingResponse,
  ]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setLastAction(null);
    start();
  }, [setOpen, setLastAction, start]);

  useEffect(() => {
    if (
      !transcript ||
      transcript === lastProcessedTranscriptRef.current ||
      lastAction
    )
      return;

    if (isSpeakingRef.current) {
      transcriptSkippedWhileSpeakingRef.current = true;
      lastProcessedTranscriptRef.current = transcript;
      return;
    }

    if (transcriptSkippedWhileSpeakingRef.current) {
      transcriptSkippedWhileSpeakingRef.current = false;
      lastProcessedTranscriptRef.current = transcript;
      return;
    }

    lastProcessedTranscriptRef.current = transcript;
    processMessage(transcript);
  }, [transcript, lastAction, processMessage, isSpeakingRef]);

  const confirmedRef = useRef(false);
  useEffect(() => {
    if (lastAction === "confirmed" && !confirmedRef.current) {
      confirmedRef.current = true;
      stop();
      speak("Done").then(() => {
        setOpen(false);
        setMessages([]);
        setInputValue("");
        setPendingConfirmation(null);
        setAwaitingResponse(false);
        setLastAction(null);
        confirmedRef.current = false;
      });
    }
    if (lastAction !== "confirmed") {
      confirmedRef.current = false;
    }
  }, [lastAction, stop, speak, setOpen, setMessages, setInputValue, setPendingConfirmation, setAwaitingResponse, setLastAction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        processMessage(inputValue.trim());
        setInputValue("");
      }
    },
    [inputValue, processMessage, setInputValue],
  );

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      processMessage(inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, processMessage, setInputValue]);

  const handleToggleRaw = useCallback(
    (index: number) => {
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === index ? { ...m, showRaw: !m.showRaw } : m,
        ),
      );
    },
    [setMessages],
  );

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <VoicePopover
          isListening={isListening}
          ready={ready}
          levels={levels}
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          onToggleMic={toggleMic}
          onToggleRaw={handleToggleRaw}
          onClose={handleClose}
        />
      )}

      <button
        type="button"
        onClick={open ? handleClose : handleOpen}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg transition-all hover:scale-105 hover:bg-accent-primary-dark focus:outline-none focus:ring-2 focus:ring-accent-primary-light focus:ring-offset-2"
        aria-label={open ? "Close assistant" : "Open voice assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
