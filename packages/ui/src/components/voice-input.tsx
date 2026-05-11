"use client";

import { useVoiceSearch } from "@Duty-Roster/ui/hooks/useVoiceSearch";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Mic } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  className?: string;
}

function VoiceInput({
  onTranscript,
  className,
}: VoiceInputProps) {
  const { isListening, isBrowserSupported, startListening, stopListening } =
    useVoiceSearch({
      onTranscript,
    });

  if (!isBrowserSupported) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }}
      className={cn(
        "rounded-md border p-1.5 transition-colors",
        isListening
          ? "border-green-400 bg-green-50 hover:bg-green-100"
          : "hover:bg-gray-50",
        className,
      )}
      title={isListening ? "Stop listening" : "Start voice input"}
      aria-label={isListening ? "Stop listening" : "Start voice input"}
    >
      <Mic
        className={cn(
          "h-4 w-4",
          isListening ? "animate-pulse text-green-500" : "text-gray-600",
        )}
      />
    </button>
  );
}

export { VoiceInput };
