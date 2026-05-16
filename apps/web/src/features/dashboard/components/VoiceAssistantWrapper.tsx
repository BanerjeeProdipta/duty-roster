"use client";

import dynamic from "next/dynamic";

// Lazy load VoiceTrigger with no SSR to avoid bundling ONNX runtime
const VoiceTrigger = dynamic(
	() =>
		import("@/features/voice-assistant/components/VoiceTrigger").then(
			(mod) => ({
				default: mod.VoiceTrigger,
			}),
		),
	{ ssr: false },
);

export function VoiceAssistantWrapper() {
	return <VoiceTrigger />;
}
