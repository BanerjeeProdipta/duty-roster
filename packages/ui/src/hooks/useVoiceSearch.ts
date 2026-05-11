"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceSearchOptions {
	onTranscript?: (transcript: string) => void;
}

interface UseVoiceSearchReturn {
	isListening: boolean;
	isBrowserSupported: boolean;
	startListening: () => void;
	stopListening: () => void;
}

const playSound = (type: "start" | "stop") => {
	if (typeof window === "undefined") return;

	const AC = window.AudioContext || (window as any).webkitAudioContext;
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
	gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

	oscillator.start(audioContext.currentTime);
	oscillator.stop(audioContext.currentTime + 0.15);
};

export function useVoiceSearch({
	onTranscript,
}: UseVoiceSearchOptions = {}): UseVoiceSearchReturn {
	const [isListening, setIsListening] = useState(false);
	const [isBrowserSupported, setIsBrowserSupported] = useState(false);

	const recognitionRef = useRef<any>(null);

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

		const SpeechRecognition =
			(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

		if (!SpeechRecognition) {
			setIsBrowserSupported(false);
			return;
		}

		const recognition = new SpeechRecognition();
		recognition.lang = "bn-BD";
		recognition.continuous = true;
		recognition.interimResults = true;

		recognition.onresult = (event: any) => {
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
		const SpeechRecognition =
			(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		setIsBrowserSupported(!!SpeechRecognition);
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