"use client";

import { motion } from "motion/react";
import { AIHeader } from "./AIHeader";
import { AIInput } from "./AIInput";
import type { ParsedMessage } from "./MessageItem";
import { MessageList } from "./MessageList";

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
	isProcessing: boolean;
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
	isProcessing,
}: AIPopoverProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95, y: 10 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95, y: 10 }}
			transition={{ duration: 0.15, ease: "easeOut" }}
			className="fixed inset-0 z-[110] flex flex-col overflow-hidden rounded-none bg-white md:absolute md:inset-auto md:right-0 md:bottom-full md:mb-3 md:h-[520px] md:w-[380px] md:rounded-2xl md:border md:shadow-2xl"
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
				isProcessing={isProcessing}
			/>

			<AIInput
				inputValue={inputValue}
				onInputChange={onInputChange}
				onKeyDown={onKeyDown}
				onSend={onSend}
				onToggleMic={onToggleMic}
				isListening={isListening}
			/>
		</motion.div>
	);
}
