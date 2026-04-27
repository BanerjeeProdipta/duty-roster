import { useCallback, useEffect, useRef, useState } from "react";

// Ambient declarations for vendor-prefixed / experimental browser APIs
declare global {
	interface Window {
		webkitAudioContext: typeof AudioContext;
		SpeechRecognition: typeof SpeechRecognition;
		webkitSpeechRecognition: typeof SpeechRecognition;
	}

	interface SpeechRecognition extends EventTarget {
		continuous: boolean;
		interimResults: boolean;
		lang: string;
		onstart: (() => void) | null;
		onend: (() => void) | null;
		onresult: ((event: SpeechRecognitionEvent) => void) | null;
		onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
		start(): void;
		stop(): void;
		abort(): void;
	}

	interface SpeechRecognitionEvent extends Event {
		readonly resultIndex: number;
		readonly results: SpeechRecognitionResultList;
	}

	interface SpeechRecognitionErrorEvent extends Event {
		readonly error: string;
		readonly message: string;
	}

	const SpeechRecognition: {
		prototype: SpeechRecognition;
		new (): SpeechRecognition;
	};
}

type Language = "en-US" | "bn-BD";

interface UseVoiceSearchOptions {
	language?: Language;
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

	const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

export function useVoiceSearch({
	language = "bn-BD",
	onTranscript,
}: UseVoiceSearchOptions = {}): UseVoiceSearchReturn {
	const [isListening, setIsListening] = useState(false);
	const [isBrowserSupported, setIsBrowserSupported] = useState(true);
	const recognitionRef = useRef<SpeechRecognition | null>(null);

	useEffect(() => {
		const SpeechRecognition =
			typeof window !== "undefined" &&
			(window.SpeechRecognition || window.webkitSpeechRecognition);
		setIsBrowserSupported(!!SpeechRecognition);
	}, []);

	const startListening = useCallback(() => {
		const SpeechRecognition =
			typeof window !== "undefined" &&
			(window.SpeechRecognition || window.webkitSpeechRecognition);

		if (!SpeechRecognition) return;

		const recognition = new SpeechRecognition();
		recognitionRef.current = recognition;

		recognition.continuous = false;
		recognition.interimResults = true;
		recognition.lang = language;

		let finalTranscript = "";

		recognition.onstart = () => {
			setIsListening(true);
			playSound("start");
		};

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			let _interimTranscript = "";
			finalTranscript = "";

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript;
				if (event.results[i].isFinal) {
					finalTranscript += `${transcript} `;
				} else {
					_interimTranscript += transcript;
				}
			}
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			console.error("Speech Recognition Error:", event.error);
			setIsListening(false);
		};

		recognition.onend = () => {
			setIsListening(false);
			playSound("stop");
			if (finalTranscript.trim()) {
				onTranscript?.(finalTranscript.trim());
			}
		};

		recognition.start();
	}, [language, onTranscript]);

	const stopListening = useCallback(() => {
		if (recognitionRef.current) {
			recognitionRef.current.abort();
			recognitionRef.current = null;
			setIsListening(false);
			playSound("stop");
		}
	}, []);

	return { isListening, isBrowserSupported, startListening, stopListening };
}
