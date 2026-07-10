"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAISearchOptions {
	onTranscript?: (transcript: string) => void;
}

interface UseAISearchReturn {
	isListening: boolean;
	isBrowserSupported: boolean;
	startListening: () => void;
	stopListening: () => void;
}

interface SpeechRecognitionInstance extends EventTarget {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onend: (() => void) | null;
	onerror: (() => void) | null;
	start(): void;
	abort(): void;
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognitionInstance;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
	return (
		(window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
			.SpeechRecognition ||
		(
			window as unknown as {
				webkitSpeechRecognition?: SpeechRecognitionConstructor;
			}
		).webkitSpeechRecognition
	);
}

const playSound = (type: "start" | "stop") => {
	if (typeof window === "undefined") return;

	const AC =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext: typeof AudioContext })
			.webkitAudioContext;
	const audioContext = new AC();
	const oscillator = audioContext.createOscillator();
	const gainNode = audioContext.createGain();

	oscillator.connect(gainNode);
	gainNode.connect(audioContext.destination);

	if (type === "start") {
		oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
		oscillator.type = "sine";
	} else {
		oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
		oscillator.type = "sine";
	}

	gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
	gainNode.gain.exponentialRampToValueAtTime(
		0.01,
		audioContext.currentTime + 0.15,
	);

	oscillator.start(audioContext.currentTime);
	oscillator.stop(audioContext.currentTime + 0.15);
};

export function useAISearch({
	onTranscript,
}: UseAISearchOptions = {}): UseAISearchReturn {
	const [isListening, setIsListening] = useState(false);
	const [isBrowserSupported, setIsBrowserSupported] = useState(false);

	const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

	const cleanup = useCallback(() => {
		if (recognitionRef.current) {
			recognitionRef.current.abort();
		}
		recognitionRef.current = null;
	}, []);

	const stopListening = useCallback(() => {
		cleanup();
		setIsListening(false);
		playSound("stop");
	}, [cleanup]);

	const startListening = useCallback(() => {
		if (isListening) return;

		const SpeechRecognitionCtor = getSpeechRecognitionCtor();

		if (!SpeechRecognitionCtor) {
			setIsBrowserSupported(false);
			return;
		}

		const recognition = new SpeechRecognitionCtor();
		recognition.lang = "bn-BD";
		recognition.continuous = true;
		recognition.interimResults = true;

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript.trim();
				if (event.results[i].isFinal) {
					onTranscript?.(transcript);
				}
			}
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognition.onerror = () => {
			setIsListening(false);
		};

		recognitionRef.current = recognition;
		recognition.start();
		setIsListening(true);
		playSound("start");
	}, [isListening, onTranscript]);

	useEffect(() => {
		setIsBrowserSupported(!!getSpeechRecognitionCtor());
	}, []);

	useEffect(() => {
		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.abort();
			}
		};
	}, []);

	return { isListening, isBrowserSupported, startListening, stopListening };
}
