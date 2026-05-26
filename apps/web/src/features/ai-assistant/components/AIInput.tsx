"use client";

import { Mic, MicOff, Send } from "lucide-react";

interface AIInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onToggleMic: () => void;
  isListening: boolean;
}

export function AIInput({
  inputValue,
  onInputChange,
  onKeyDown,
  onSend,
  onToggleMic,
  isListening,
}: AIInputProps) {
  return (
    <div className="border-gray-100 border-t bg-white px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm outline-none transition-all focus:border-accent-primary focus:bg-white focus:ring-1 focus:ring-accent-primary-light"
          />
        </div>

        <button
          type="button"
          onClick={onToggleMic}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all ${
            isListening
              ? "animate-pulse bg-red-500 text-white"
              : "bg-accent-primary text-white hover:bg-accent-primary-dark"
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
            onClick={onSend}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-all hover:bg-gray-800"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
