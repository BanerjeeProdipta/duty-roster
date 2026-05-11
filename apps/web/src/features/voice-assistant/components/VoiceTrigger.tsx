"use client";

import { Bot, Mic, MicOff, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVoice } from "@/features/voice-assistant/hooks/useVoice";
import { useConfirmShiftUpdate } from "@/features/voice-assistant/hooks/useConfirmShiftUpdate";
import { parseCommand } from "../utils/commandParser";
import type { ParsedMessage } from "./MessageItem";
import { MessageItem, WaveAnimation } from "./MessageItem";

const POPOVER_WIDTH = 380;
const POPOVER_HEIGHT = 520;

interface PendingConfirmation {
  nurseName: string;
  shift: string;
  date: string;
}

export function VoiceTrigger() {
  const { transcript, partial, isListening, levels, start, stop, ready } =
    useVoice();
  const { confirmShiftUpdate } = useConfirmShiftUpdate();

  const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [messages, setMessages] = useState<ParsedMessage[]>([]);
	const [pendingConfirmation, setPendingConfirmation] =
		useState<PendingConfirmation | null>(null);
	const [awaitingResponse, setAwaitingResponse] = useState(false);
	const [lastAction, setLastAction] = useState<"confirmed" | "cancelled" | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const lastProcessedTranscriptRef = useRef<string>("");
	const isSpeakingRef = useRef(false);

	const speak = (text: string): Promise<void> => {
		return new Promise((resolve) => {
			if (typeof window === "undefined" || !window.speechSynthesis) {
				resolve();
				return;
			}
			window.speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.rate = 1.1;
			utterance.pitch = 1;
			utterance.onstart = () => {
				isSpeakingRef.current = true;
			};
			utterance.onend = () => {
				isSpeakingRef.current = false;
				resolve();
			};
			utterance.onerror = () => {
				isSpeakingRef.current = false;
				resolve();
			};
			window.speechSynthesis.speak(utterance);
		});
	};

	useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isListening, partial]);

useEffect(() => {
		if (!transcript || transcript === lastProcessedTranscriptRef.current || isSpeakingRef.current || lastAction) return;
		lastProcessedTranscriptRef.current = transcript;
		addMessage(transcript);
	}, [transcript, lastAction]);

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
  }, [stop]);

  const askForMissingFields = (missingFields: string[]) => {
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
  };

  const askForConfirmation = (
    nurseName: string,
    shift: string,
    date: string,
  ) => {
    const msg = `Do you want to update ${nurseName}'s shift to ${shift} on ${date}? To confirm say yes, to cancel say no.`;
    setPendingConfirmation({ nurseName, shift, date });
    setMessages((prev) => [
      ...prev,
      {
        raw: msg,
        isSystem: true,
      } as ParsedMessage,
    ]);
    setAwaitingResponse(true);
    speak(msg);
  };

  const addMessage = (text: string) => {
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

    if (
      parsed.action === "update" &&
      parsed.nurseName &&
      parsed.shift &&
      parsed.date
    ) {
      setAwaitingResponse(false);
      askForConfirmation(parsed.nurseName, parsed.shift, parsed.date);
    } else if (parsed.missingFields.length > 0) {
      if (awaitingResponse) {
        return;
      }
      askForMissingFields(parsed.missingFields);
    } else {
      setAwaitingResponse(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        addMessage(inputValue.trim());
        setInputValue("");
      }
    },
    [inputValue],
  );

const handleOpen = useCallback(() => {
		setOpen(true);
		setLastAction(null);
		start();
	}, [start]);

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{ width: POPOVER_WIDTH, height: POPOVER_HEIGHT }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-gray-100 border-b bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-600">
                <Bot className="size-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  Assistant
                </h3>
                <p className="text-gray-500 text-xs">
                  {isListening ? "Listening..." : ready ? "Tap to speak" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-3">
            {messages.length === 0 && !isListening && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-blue-50">
                  <Bot className="size-6 text-blue-600" />
                </div>
                <p className="font-medium text-gray-700 text-sm">
                  Hey, how can I help?
                </p>
                <p className="mt-1 text-gray-400 text-xs">
                  Tap the mic or type to assign shifts
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageItem
                key={`msg-${i}`}
                message={msg}
                onToggleRaw={() =>
                  setMessages((prev) =>
                    prev.map((m, idx) =>
                      idx === i ? { ...m, showRaw: !m.showRaw } : m,
                    ),
                  )
                }
              />
            ))}

            {isListening && (
              <div className="flex flex-col items-center gap-3 py-4">
                <WaveAnimation levels={levels} />
                <p className="text-gray-400 text-xs">Listening...</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-gray-100 border-t bg-white px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command..."
                  className="w-full rounded-full border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400"
                />
              </div>

              <button
                type="button"
                onClick={toggleMic}
                className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all ${
                  isListening
                    ? "animate-pulse bg-red-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                aria-label={isListening ? "Stop recording" : "Start recording"}
              >
                {isListening ? (
                  <MicOff className="size-4" />
                ) : (
                  <Mic className="size-4" />
                )}
              </button>

              {inputValue.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    addMessage(inputValue.trim());
                    setInputValue("");
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-all hover:bg-gray-800"
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={open ? handleClose : handleOpen}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700"
        aria-label={open ? "Close assistant" : "Open voice assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
