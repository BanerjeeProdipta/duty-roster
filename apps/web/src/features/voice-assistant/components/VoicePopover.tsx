"use client";

import type { ParsedMessage } from "./MessageItem";
import { VoiceHeader } from "./VoiceHeader";
import { MessageList } from "./MessageList";
import { VoiceInput } from "./VoiceInput";

const POPOVER_WIDTH = 380;
const POPOVER_HEIGHT = 520;

interface VoicePopoverProps {
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

export function VoicePopover({
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
}: VoicePopoverProps) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      style={{ width: POPOVER_WIDTH, height: POPOVER_HEIGHT }}
    >
      <VoiceHeader isListening={isListening} ready={ready} />

      <MessageList
        messages={messages}
        isListening={isListening}
        levels={levels}
        partial={partial}
        error={error}
        ready={ready}
        onToggleRaw={onToggleRaw}
      />

      <VoiceInput
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