"use client";

import { ArrowUpRight } from "lucide-react";

const SUGGESTED_PROMPTS = [
	"Who's on morning shift today?",
	"Set Margaret to night shift tomorrow",
	"Show me Friday's roster",
	"Give Salma the day off on Monday",
];

interface PromptSuggestionsProps {
	onSelect: (prompt: string) => void;
}

export function PromptSuggestions({ onSelect }: PromptSuggestionsProps) {
	return (
		<div className="w-full pt-4">
			<p className="mb-2 text-center font-medium text-[11px] text-gray-400 uppercase tracking-wide">
				Try prompts like this
			</p>
			<div className="flex w-full flex-col divide-y divide-gray-100">
				{SUGGESTED_PROMPTS.map((prompt) => (
					<button
						key={prompt}
						type="button"
						onClick={() => onSelect(prompt)}
						className="group flex w-full items-center justify-between gap-2 px-1 py-2 text-left text-gray-500 text-xs transition-colors hover:text-accent-primary"
					>
						<span className="truncate">{prompt}</span>
						<ArrowUpRight className="size-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-accent-primary" />
					</button>
				))}
			</div>
		</div>
	);
}
