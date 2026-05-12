"use client";

import { useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import type { ParsedMessage } from "./MessageItem";
import { MessageItem, WaveAnimation } from "./MessageItem";

interface MessageListProps {
  messages: ParsedMessage[];
  isListening: boolean;
  levels: number[];
  onToggleRaw: (index: number) => void;
}

export function MessageList({
  messages,
  isListening,
  levels,
  onToggleRaw,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isListening]);

  return (
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
          onToggleRaw={() => onToggleRaw(i)}
        />
      ))}

      {isListening && (
        <div className="flex flex-col items-center gap-3 py-4">
          <WaveAnimation levels={levels} />
          <p className="text-gray-400 text-xs">Listening...</p>
        </div>
      )}
    </div>
  );
}
