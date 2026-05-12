"use client";

import { Bot } from "lucide-react";

interface VoiceHeaderProps {
  isListening: boolean;
  ready: boolean;
}

export function VoiceHeader({ isListening, ready }: VoiceHeaderProps) {
  return (
    <div className="flex items-center justify-between border-gray-100 border-b bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-blue-600">
          <Bot className="size-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Assistant</h3>
          <p className="text-gray-500 text-xs">
            {isListening ? "Listening..." : ready ? "Tap to speak" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}