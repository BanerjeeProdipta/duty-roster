"use client";

import { VoiceInput } from "@Duty-Roster/ui/components/voice-input";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";

interface SearchInputProps
	extends Omit<ComponentProps<"input">, "value" | "onChange"> {
	value?: string;
	onChange?: (value: string) => void;
	onSearch?: (value: string) => void;
	language?: "en-US" | "bn-BD";
	onLanguageChange?: (language: "en-US" | "bn-BD") => void;
	suggestions?: string[];
	suggestionCount?: number;
	trailing?: React.ReactNode;
	inputClassName?: string;
}

const banglaUI = {
	stopListening: "শোনা বন্ধ করুন",
	startVoiceSearch: "কণ্ঠস্বর ইনপুট শুরু করুন",
	clear: "পরিষ্কার করুন",
};

const englishUI = {
	stopListening: "Stop listening",
	startVoiceSearch: "Start voice search",
	clear: "Clear",
};

function SearchInput({
	value: controlledValue,
	onChange: controlledOnChange,
	onSearch,
	language = "bn-BD",
	onLanguageChange,
	suggestions = [],
	suggestionCount = 10,
	className,
	inputClassName,
	placeholder,
	trailing,
	...props
}: SearchInputProps) {
	const [internalValue, setInternalValue] = useState("");
	const currentValue = controlledValue ?? internalValue;
	const valueRef = useRef(currentValue);
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		valueRef.current = currentValue;
	}, [currentValue]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const ui = language === "bn-BD" ? banglaUI : englishUI;

	const debouncedSearch = (value: string) => {
		if (!onSearch) return;
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		searchTimerRef.current = setTimeout(() => {
			onSearch(value);
		}, 300);
	};

	const handleValueChange = (newValue: string) => {
		valueRef.current = newValue;
		if (controlledOnChange) {
			controlledOnChange(newValue);
		} else {
			setInternalValue(newValue);
		}
		setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0);
		setHighlightedIndex(-1);
		debouncedSearch(newValue);
	};

	const toggleLanguage = () => {
		const newLang = language === "bn-BD" ? "en-US" : "bn-BD";
		if (onLanguageChange) {
			onLanguageChange(newLang);
		}
	};

	const filteredSuggestions = suggestions
		.filter((s) => s.toLowerCase().includes(currentValue.toLowerCase()))
		.slice(0, suggestionCount);

	const handleClear = () => {
		handleValueChange("");
	};

	const handleSelectSuggestion = (suggestion: string) => {
		handleValueChange(suggestion);
		setShowSuggestions(false);
		setHighlightedIndex(-1);
		if (onSearch) {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
			onSearch(suggestion);
		}
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

	useEffect(() => {
		return () => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		};
	}, []);

	return (
		<div ref={containerRef} className="relative flex flex-col gap-1">
			<div
				className={cn(
					"flex items-center gap-2 rounded-xl border bg-white px-3 py-2",
					className,
				)}
			>
				<input
					type="text"
					value={currentValue}
					onChange={(e) => handleValueChange(e.target.value)}
					onKeyDown={(e) => {
						handleKeyDown(e);
						props.onKeyDown?.(e);
					}}
					onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
					placeholder={placeholder}
					className={cn(
						"flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400",
						language === "bn-BD" && "text-base",
						inputClassName,
					)}
					{...props}
				/>
				{currentValue && (
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
				<VoiceInput
					language={language}
					onTranscript={(transcript) =>
						handleValueChange(valueRef.current + transcript)
					}
				/>
				<button
					type="button"
					onClick={toggleLanguage}
					className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-xs transition-colors hover:bg-slate-50"
					title={language === "bn-BD" ? "Switch to English" : "বাংলায় সুইচ করুন"}
					aria-label={
						language === "bn-BD" ? "Switch to English" : "বাংলায় সুইচ করুন"
					}
				>
					{language === "bn-BD" ? "বাং" : "EN"}
				</button>
				{trailing}
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
