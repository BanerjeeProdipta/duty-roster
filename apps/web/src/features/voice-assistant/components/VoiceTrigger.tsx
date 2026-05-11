"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, X, Send } from "lucide-react";
import { useVoice } from "@/features/voice-assistant/hooks/useVoice";
import { parseCommand } from "../utils/commandParser";
import { MessageItem, WaveAnimation } from "./MessageItem";
import type { ParsedMessage } from "./MessageItem";

const POPOVER_WIDTH = 380;
const POPOVER_HEIGHT = 520;

export function VoiceTrigger() {
  const { transcript, partial, isListening, levels, start, stop, ready } =
    useVoice();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isListening, partial]);

  useEffect(() => {
    if (!transcript) return;
    addMessage(transcript);
  }, [transcript]);

  const addMessage = (text: string) => {
    const parsed = parseCommand(text);
    setMessages((prev) => [
      ...prev,
      {
        raw: text,
        showRaw: false,
        command:
          parsed.shift || parsed.date || parsed.nurseName ? parsed : undefined,
      },
    ]);
  };

  const toggleMic = useCallback(() => {
    isListening ? stop() : start();
  }, [isListening, stop, start]);

  const handleClose = useCallback(() => {
    stop();
    setOpen(false);
    setMessages([]);
    setInputValue("");
  }, [stop]);

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
    start();
  }, [start]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200"
          style={{ width: POPOVER_WIDTH, height: POPOVER_HEIGHT }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-600">
                <Bot className="size-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Assistant
                </h3>
                <p className="text-xs text-gray-500">
                  {isListening
                    ? "Listening..."
                    : ready
                      ? "Tap to speak"
                      : "Connecting..."}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && !isListening && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-blue-50">
                  <Bot className="size-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Hey, how can I help?
                </p>
                <p className="mt-1 text-xs text-gray-400">
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
                <p className="text-xs text-gray-400">Listening...</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-100 bg-white px-3 py-2.5">
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
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 bg-blue-600 text-white hover:bg-blue-700"
        aria-label={open ? "Close assistant" : "Open voice assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
