import { useCallback, useEffect, useRef, useState } from "react";

type Language = "en-US" | "bn-BD";

interface UseVoiceSearchOptions {
	language?: Language;
	onTranscript?: (transcript: string) => void;
	onInterim?: (transcript: string) => void;
}

interface UseVoiceSearchReturn {
	isListening: boolean;
	isBrowserSupported: boolean;
	startListening: () => void;
	stopListening: () => void;
}

const TARGET_SAMPLE_RATE = 16_000;

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
	gainNode.gain.exponentialRampToValueAtTime(
		0.01,
		audioContext.currentTime + 0.15,
	);

	oscillator.start(audioContext.currentTime);
	oscillator.stop(audioContext.currentTime + 0.15);
};

function float32ToPcm16(
	samples: Float32Array,
	sampleRate: number,
): ArrayBuffer {
	const ratio = sampleRate / TARGET_SAMPLE_RATE;
	const newLen = Math.floor(samples.length / ratio);
	const buf = new ArrayBuffer(newLen * 2);
	const view = new DataView(buf);

	for (let i = 0; i < newLen; i++) {
		const s = Math.max(-1, Math.min(1, samples[Math.floor(i * ratio)] ?? 0));
		view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
	}

	return buf;
}

const VOICE_SERVER_URL =
	(typeof process !== "undefined" &&
		(process as any).env?.NEXT_PUBLIC_VOICE_SERVER_URL) ??
	"ws://localhost:3002";

export function useVoiceSearch({
	onTranscript,
	onInterim,
}: UseVoiceSearchOptions = {}): UseVoiceSearchReturn {
	const [isListening, setIsListening] = useState(false);
	const [isBrowserSupported, setIsBrowserSupported] = useState(true);

	const wsRef = useRef<WebSocket | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const processorRef = useRef<ScriptProcessorNode | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

	const isListeningRef = useRef(false);

	const cleanup = useCallback(() => {
		if (processorRef.current && sourceRef.current && audioCtxRef.current) {
			sourceRef.current.disconnect();
			processorRef.current.disconnect();
		}
		if (audioCtxRef.current) {
			audioCtxRef.current.close();
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((t) => t.stop());
		}
		processorRef.current = null;
		sourceRef.current = null;
		audioCtxRef.current = null;
		streamRef.current = null;
		wsRef.current = null;
		isListeningRef.current = false;
	}, []);

	const stopListening = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.close();
		}
		cleanup();
		setIsListening(false);
		playSound("stop");
	}, [cleanup]);

	const startListening = useCallback(() => {
		if (isListeningRef.current) return;

		const ws = new WebSocket(`${VOICE_SERVER_URL}/voice/stream`);
		ws.binaryType = "arraybuffer";
		wsRef.current = ws;

		ws.onopen = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						sampleRate: TARGET_SAMPLE_RATE,
						channelCount: 1,
						echoCancellation: true,
						noiseSuppression: true,
					},
				});
				streamRef.current = stream;

				const audioCtx = new AudioContext();
				audioCtxRef.current = audioCtx;

				const source = audioCtx.createMediaStreamSource(stream);
				sourceRef.current = source;

				const processor = audioCtx.createScriptProcessor(4096, 1, 1);
				processorRef.current = processor;

				const inputSampleRate = audioCtx.sampleRate ?? TARGET_SAMPLE_RATE;

				processor.onaudioprocess = (event) => {
					if (ws.readyState !== WebSocket.OPEN) return;
					const input = event.inputBuffer.getChannelData(0);
					ws.send(float32ToPcm16(input, inputSampleRate));
				};

				source.connect(processor);
				processor.connect(audioCtx.destination);

				isListeningRef.current = true;
				setIsListening(true);
				playSound("start");
			} catch {
				ws.close();
				setIsBrowserSupported(false);
			}
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "partial") {
					onInterim?.(data.text);
				} else if (data.type === "result" && data.text) {
					onTranscript?.(data.text);
				}
			} catch {
				// ignore malformed messages
			}
		};

		ws.onclose = () => {
			setIsListening(false);
			cleanup();
		};

		ws.onerror = () => {
			setIsBrowserSupported(false);
			cleanup();
		};
	}, [onTranscript, onInterim, cleanup]);

	useEffect(() => {
		setIsBrowserSupported(
			typeof window !== "undefined" &&
				typeof navigator.mediaDevices?.getUserMedia === "function",
		);
	}, []);

	return { isListening, isBrowserSupported, startListening, stopListening };
}
