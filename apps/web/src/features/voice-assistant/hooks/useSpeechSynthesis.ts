"use client";

import { useCallback, useRef } from "react";

interface UseSpeechSynthesisReturn {
	speak: (text: string) => Promise<void>;
	isSpeakingRef: React.MutableRefObject<boolean>;
}

const TTS_URL = process.env.NEXT_PUBLIC_TTS_URL || "http://localhost:8001";

const ENABLE_BROWSER_PIPER = process.env.NEXT_PUBLIC_BROWSER_PIPER === "true";
const USE_LOCAL_PIPER_ASSETS =
	process.env.NEXT_PUBLIC_PIPER_LOCAL_ASSETS === "true";

let browserPiperSession: any = null;
let browserPiperInit: Promise<void> | null = null;

const PIPER_WASM_PATH = USE_LOCAL_PIPER_ASSETS
	? "/piper-assets/piper/piper_phonemize"
	: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";
const ONNX_WASM_PATH = USE_LOCAL_PIPER_ASSETS
	? "/piper-assets/onnx/"
	: "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.26.0/";

let initBrowserPiper: () => Promise<void>;
let speakBrowserPiper: (
	text: string,
	isSpeakingRef: React.MutableRefObject<boolean>,
) => Promise<void>;

if (ENABLE_BROWSER_PIPER) {
	initBrowserPiper = async () => {
		if (browserPiperSession) return;
		if (!browserPiperInit) {
			browserPiperInit = (async () => {
				const { TtsSession } = await import("@mintplex-labs/piper-tts-web");
				browserPiperSession = await TtsSession.create({
					voiceId: "en_US-hfc_female-medium",
					logger: (msg: string) => console.log("[Piper]", msg),
					wasmPaths: {
						onnxWasm: ONNX_WASM_PATH,
						piperData: `${PIPER_WASM_PATH}.data`,
						piperWasm: `${PIPER_WASM_PATH}.wasm`,
					},
				});
			})().catch((e) => {
				console.error("[Piper] init failed, will retry next time:", e);
				browserPiperInit = null;
			});
		}
		await browserPiperInit;
	};

	speakBrowserPiper = async (
		text: string,
		isSpeakingRef: React.MutableRefObject<boolean>,
	): Promise<void> => {
		await initBrowserPiper();
		isSpeakingRef.current = true;
		const blob = await browserPiperSession.predict(text);
		await playBlob(blob);
		isSpeakingRef.current = false;
	};
} else {
	initBrowserPiper = async () => {
		throw new Error("Browser Piper is disabled in this build.");
	};

	speakBrowserPiper = async () => {
		throw new Error("Browser Piper is disabled in this build.");
	};
}

function playBlob(blob: Blob): Promise<void> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);
		audio.onended = () => {
			URL.revokeObjectURL(url);
			resolve();
		};
		audio.onerror = (e) => {
			URL.revokeObjectURL(url);
			reject(e);
		};
		audio.play().catch(reject);
	});
}

async function speakServerPiper(
	text: string,
	isSpeakingRef: React.MutableRefObject<boolean>,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const audioContext = new (
			window.AudioContext || (window as any).webkitAudioContext
		)();

		isSpeakingRef.current = true;

		fetch(`${TTS_URL}/synthesize?text=${encodeURIComponent(text)}`)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`TTS request failed: ${response.status}`);
				}
				return response.arrayBuffer();
			})
			.then((arrayBuffer) => {
				audioContext.decodeAudioData(
					arrayBuffer,
					(audioBuffer) => {
						const source = audioContext.createBufferSource();
						source.buffer = audioBuffer;
						source.connect(audioContext.destination);

						source.onended = () => {
							isSpeakingRef.current = false;
							resolve();
						};

						source.start(0);
					},
					(error) => {
						console.error("Audio decode error:", error);
						isSpeakingRef.current = false;
						reject(error);
					},
				);
			})
			.catch((error) => {
				console.error("TTS server error:", error);
				isSpeakingRef.current = false;
				reject(error);
			});
	});
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

		// 1. Try browser Piper (WASM, works everywhere, no server needed)
		if (ENABLE_BROWSER_PIPER) {
			try {
				await speakBrowserPiper(text, isSpeakingRef);
				return;
			} catch (e) {
				console.warn(
					`[TTS] Browser Piper failed: ${(e as Error)?.message ?? e}`,
				);
			}
		}

		// 2. Try server Piper (local Python TTS server)
		try {
			await speakServerPiper(text, isSpeakingRef);
			return;
		} catch (e) {
			console.warn(`[TTS] Server Piper failed: ${(e as Error)?.message ?? e}`);
		}

		// 3. Fallback to Web Speech API
		try {
			await speakWebSpeechAPI(text, isSpeakingRef);
		} catch (e) {
			console.error(`[TTS] All methods failed: ${(e as Error)?.message ?? e}`);
			isSpeakingRef.current = false;
		}
	}, []);

	return {
		speak,
		isSpeakingRef,
	};
}
