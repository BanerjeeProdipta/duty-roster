"use client";

import { Bot, X } from "lucide-react";

interface AIHeaderProps {
	isListening: boolean;
	ready: boolean;
	onClose?: () => void;
}

export function AIHeader({ isListening, ready, onClose }: AIHeaderProps) {
	return (
		<div className="flex items-center justify-between border-gray-100 border-b bg-gray-50 px-4 py-3">
			<div className="flex items-center gap-2">
				<div className="flex size-8 items-center justify-center rounded-full bg-accent-primary">
					<Bot className="size-4 text-white" />
				</div>
				<div>
					<h3 className="font-semibold text-gray-900 text-sm">Assistant</h3>
					<p className="text-gray-500 text-xs">
						{isListening ? "Listening..." : ready ? "Tap to speak" : ""}
					</p>
				</div>
			</div>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 lg:hidden"
					aria-label="Close assistant"
				>
					<X className="size-5" />
				</button>
			)}
		</div>
	);
}
