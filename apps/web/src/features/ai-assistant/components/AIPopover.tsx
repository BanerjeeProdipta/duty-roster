"use client";

import type { ParsedMessage } from "./MessageItem";
import { AIHeader } from "./AIHeader";
import { MessageList } from "./MessageList";
import { AIInput } from "./AIInput";

interface AIPopoverProps {
  isListening: boolean;
  ready: boolean;
  levels: number[];
  messages: ParsedMessage[];
  partial?: string;
  error?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onToggleMic: () => void;
  onToggleRaw?: (index: number) => void;
  onClose: () => void;
}

export function AIPopover({
  isListening,
  ready,
  levels,
  messages,
  partial,
  error,
  inputValue,
  onInputChange,
  onKeyDown,
  onSend,
  onToggleMic,
  onToggleRaw,
  onClose,
}: AIPopoverProps) {
  return (
    <div
      className="
        fixed inset-0 z-[110]
        md:absolute md:inset-auto
        md:bottom-full md:right-0 md:mb-3
        md:w-[380px] md:h-[520px]
        flex flex-col overflow-hidden bg-white
        md:rounded-2xl md:border md:shadow-2xl
        rounded-none
      "
    >
      <AIHeader isListening={isListening} ready={ready} onClose={onClose} />

      <MessageList
        messages={messages}
        isListening={isListening}
        levels={levels}
        partial={partial}
        error={error}
        ready={ready}
        onToggleRaw={onToggleRaw}
      />

      <AIInput
        inputValue={inputValue}
        onInputChange={onInputChange}
        onKeyDown={onKeyDown}
        onSend={onSend}
        onToggleMic={onToggleMic}
        isListening={isListening}
      />
    </div>
  );
}