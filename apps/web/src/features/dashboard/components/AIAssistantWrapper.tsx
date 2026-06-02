"use client";

import dynamic from "next/dynamic";

// Lazy load AITrigger with no SSR to avoid bundling ONNX runtime
const AITrigger = dynamic(
	() =>
		import("@/features/ai-assistant/components/AITrigger").then((mod) => ({
			default: mod.AITrigger,
		})),
	{ ssr: false },
);

export function AIAssistantWrapper() {
	return <AITrigger />;
}
