"use client";

import { useVoiceSearch } from "@Duty-Roster/ui/hooks/useVoiceSearch";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Mic, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";

interface SearchInputProps
	extends Omit<ComponentProps<"input">, "value" | "onChange"> {
	paramKey?: string;
	language?: "en-US" | "bn-BD";
	suggestions?: string[];
	suggestionCount?: number;
}

const banglaUI = {
	stopListening: "শোনা বন্ধ করুন",
	startVoiceSearch: "কণ্ঠস্বর অনুসন্ধান শুরু করুন",
	clear: "পরিষ্কার করুন",
};

const englishUI = {
	stopListening: "Stop listening",
	startVoiceSearch: "Start voice search",
	clear: "Clear",
};

function SearchInput({
	paramKey = "q",
	language = "bn-BD",
	suggestions = [],
	suggestionCount = 10,
	className,
	placeholder,
	...props
}: SearchInputProps) {
	const searchParams = useSearchParams();
	const urlValue = searchParams.get(paramKey) ?? "";
	const [value, setValue] = useState(urlValue);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const ui = language === "bn-BD" ? banglaUI : englishUI;

	useEffect(() => {
		setValue(searchParams.get(paramKey) ?? "");
	}, [searchParams, paramKey]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredSuggestions = suggestions
		.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
		.slice(0, suggestionCount);

	const { isListening, isBrowserSupported, startListening, stopListening } =
		useVoiceSearch({
			language,
			onTranscript: (transcript) => {
				setValue((prev) => prev + transcript);
			},
		});

	const handleChange = (newValue: string) => {
		setValue(newValue);
		setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0);
		setHighlightedIndex(-1);
		const params = new URLSearchParams(window.location.search);
		if (newValue) {
			params.set(paramKey, newValue);
		} else {
			params.delete(paramKey);
		}
		window.history.pushState(
			null,
			"",
			params.toString() ? `?${params.toString()}` : window.location.pathname,
		);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showSuggestions || filteredSuggestions.length === 0) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
				);
				break;
			case "ArrowUp":
				e.preventDefault();
				setHighlightedIndex((prev) =>
					prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
				);
				break;
			case "Enter":
				e.preventDefault();
				if (highlightedIndex >= 0) {
					const selected = filteredSuggestions[highlightedIndex];
					if (selected) {
						handleSelectSuggestion(selected);
					}
				}
				break;
			case "Escape":
				setShowSuggestions(false);
				break;
		}
	};

	const handleSelectSuggestion = (suggestion: string) => {
		handleChange(suggestion);
		setShowSuggestions(false);
	};

	const handleClear = () => {
		setValue("");
		setShowSuggestions(false);
		setHighlightedIndex(-1);
		const params = new URLSearchParams(window.location.search);
		params.delete(paramKey);
		window.history.pushState(null, "", window.location.pathname);
	};

	return (
		<div ref={containerRef} className="relative flex flex-1 flex-col gap-1">
			<div
				className={cn(
					"flex items-center gap-2 rounded-xl border bg-white px-3 py-2",
					className,
				)}
			>
				<Search className="h-4 w-4 text-slate-400" />
				<input
					type="text"
					value={value}
					onChange={(e) => handleChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
					placeholder={placeholder}
					className={cn(
						"flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400",
						language === "bn-BD" && "text-base",
					)}
					{...props}
				/>
				{value && (
					<button
						type="button"
						onClick={handleClear}
						className="transition-opacity hover:opacity-70"
						title={ui.clear}
						aria-label={ui.clear}
					>
						<X className="h-4 w-4 text-slate-400" />
					</button>
				)}
				{isBrowserSupported && (
					<button
						type="button"
						onClick={isListening ? stopListening : startListening}
						className={cn(
							"rounded-md border p-1.5 transition-colors",
							isListening
								? "border-green-400 bg-green-50 hover:bg-green-100"
								: "hover:bg-slate-50",
						)}
						title={isListening ? ui.stopListening : ui.startVoiceSearch}
						aria-label={isListening ? ui.stopListening : ui.startVoiceSearch}
					>
						<Mic
							className={cn(
								"h-4 w-4",
								isListening ? "animate-pulse text-green-500" : "text-slate-600",
							)}
						/>
					</button>
				)}
			</div>
			{showSuggestions && filteredSuggestions.length > 0 && (
				<div
					ref={listRef}
					id="search-suggestions"
					role="listbox"
					className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg"
				>
					{filteredSuggestions.map((suggestion, index) => (
						<button
							key={suggestion}
							type="button"
							role="option"
							aria-selected={index === highlightedIndex}
							onClick={() => handleSelectSuggestion(suggestion)}
							className={cn(
								"w-full px-3 py-2 text-left text-sm transition-colors",
								index === highlightedIndex
									? "bg-blue-500 text-white"
									: "hover:bg-slate-100",
							)}
						>
							{suggestion}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export { SearchInput };
