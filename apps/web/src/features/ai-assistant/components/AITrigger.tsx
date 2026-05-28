"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bot, X } from "lucide-react";
import { useAI } from "@/features/ai-assistant/hooks/useAI";
import { useAIAssistantState } from "@/features/ai-assistant/hooks/useAIAssistantState";
import { useAIAssistantLogic } from "@/features/ai-assistant/hooks/useAIAssistantLogic";
import { AIPopover } from "./AIPopover";

export function AITrigger() {
  const {
    transcript,
    partial,
    isListening,
    levels,
    start,
    stop,
    ready,
    error,
  } = useAI();

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
  } = useAIAssistantState();

  const { processMessage, speak, isSpeakingRef, lastSpeechEndedRef } =
    useAIAssistantLogic({
      pendingConfirmation,
      setPendingConfirmation,
      awaitingResponse,
      setAwaitingResponse,
      setLastAction,
      setMessages,
    });

  const lastProcessedTranscriptRef = useRef("");
  const echoDeadlineRef = useRef(0);

  // Debug: log transcript/partial changes
  useEffect(() => {
    if (partial) console.log("[AITrigger] partial transcript:", partial);
  }, [partial]);

  useEffect(() => {
    if (transcript) console.log("[AITrigger] final transcript:", transcript);
  }, [transcript]);

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

    const now = Date.now();
    const recentlySpoke =
      lastSpeechEndedRef.current > 0 && now - lastSpeechEndedRef.current < 3000;

    if (isSpeakingRef.current || recentlySpoke) {
      console.log(
        "[AITrigger] skipped while speaking or immediately after speech:",
        transcript,
      );
      echoDeadlineRef.current = now + 3000;
      lastProcessedTranscriptRef.current = transcript;
      return;
    }

    if (Date.now() < echoDeadlineRef.current) {
      console.log("[AITrigger] skipping echoed transcript:", transcript);
      lastProcessedTranscriptRef.current = transcript;
      return;
    }

    console.log("[AITrigger] processing transcript:", transcript);
    lastProcessedTranscriptRef.current = transcript;
    processMessage(transcript);
  }, [transcript, lastAction, processMessage, isSpeakingRef]);

  const confirmedRef = useRef(false);
  const cancelledRef = useRef(false);
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
    } else if (lastAction === "cancelled" && !cancelledRef.current) {
      cancelledRef.current = true;
      stop();
      speak("Cancelled").then(() => {
        setOpen(false);
        setMessages([]);
        setInputValue("");
        setPendingConfirmation(null);
        setAwaitingResponse(false);
        setLastAction(null);
        cancelledRef.current = false;
      });
    } else if (lastAction !== "confirmed") {
      confirmedRef.current = false;
    }
    if (lastAction !== "cancelled") {
      cancelledRef.current = false;
    }
  }, [
    lastAction,
    stop,
    speak,
    setOpen,
    setMessages,
    setInputValue,
    setPendingConfirmation,
    setAwaitingResponse,
    setLastAction,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        processMessage(inputValue.trim(), { skipTTS: true });
        setInputValue("");
      }
    },
    [inputValue, processMessage, setInputValue],
  );

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      processMessage(inputValue.trim(), { skipTTS: true });
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
    <div className="fixed right-6 bottom-6 z-[110] flex flex-col items-end gap-3">
      {open && (
        <AIPopover
          isListening={isListening}
          ready={ready}
          levels={levels}
          messages={messages}
          partial={partial}
          error={error}
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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg transition-all group hover:bg-accent-primary-dark focus:outline-none focus:ring-2 focus:ring-accent-primary-light focus:ring-offset-2"
        aria-label={open ? "Close assistant" : "Open AI assistant"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6 group-hover:scale-105" />
        )}
      </button>
    </div>
  );
}
