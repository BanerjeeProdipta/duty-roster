"use client";

import { useCallback, useRef } from "react";

interface UseSpeechSynthesisReturn {
	speak: (text: string) => Promise<void>;
	isSpeakingRef: React.MutableRefObject<boolean>;
}

function speakWebSpeechAPI(
	text: string,
	isSpeakingRef: React.MutableRefObject<boolean>,
): Promise<void> {
	return new Promise((resolve) => {
		if (typeof window === "undefined" || !window.speechSynthesis) {
			resolve();
			return;
		}

		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = 1.1;
		utterance.pitch = 1;

		utterance.onstart = () => {
			isSpeakingRef.current = true;
		};

		utterance.onend = () => {
			isSpeakingRef.current = false;
			resolve();
		};

		utterance.onerror = () => {
			isSpeakingRef.current = false;
			resolve();
		};

		window.speechSynthesis.speak(utterance);
	});
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
	const isSpeakingRef = useRef(false);

	const speak = useCallback(async (text: string): Promise<void> => {
		if (typeof window === "undefined") {
			return;
		}

		try {
			await speakWebSpeechAPI(text, isSpeakingRef);
		} catch (e) {
			console.error(`[TTS] Failed: ${(e as Error)?.message ?? e}`);
			isSpeakingRef.current = false;
		}
	}, []);

	return {
		speak,
		isSpeakingRef,
	};
}
