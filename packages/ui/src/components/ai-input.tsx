"use client";

import { useAISearch } from "@Duty-Roster/ui/hooks/useAISearch";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Mic } from "lucide-react";

interface AIInputProps {
	onTranscript: (transcript: string) => void;
	className?: string;
}

function AIInput({ onTranscript, className }: AIInputProps) {
	const { isListening, isBrowserSupported, startListening, stopListening } =
		useAISearch({
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
					? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100"
					: "hover:bg-gray-50",
				className,
			)}
			title={isListening ? "Stop listening" : "Start AI input"}
			aria-label={isListening ? "Stop listening" : "Start AI input"}
		>
			<Mic
				className={cn(
					"h-4 w-4",
					isListening ? "animate-pulse text-emerald-500" : "text-gray-600",
				)}
			/>
		</button>
	);
}

export { AIInput };
