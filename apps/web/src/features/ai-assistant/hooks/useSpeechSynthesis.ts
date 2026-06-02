"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseSpeechSynthesisReturn {
	speak: (text: string) => Promise<void>;
	isSpeakingRef: React.MutableRefObject<boolean>;
}

async function preloadVoices(): Promise<void> {
	if (typeof window === "undefined" || !window.speechSynthesis) return;

	const synth = window.speechSynthesis;
	const voices = synth.getVoices();
	if (voices.length > 0) return;

	await new Promise<void>((resolve) => {
		const timeout = window.setTimeout(() => {
			synth.onvoiceschanged = null;
			resolve();
		}, 1000);

		synth.onvoiceschanged = () => {
			window.clearTimeout(timeout);
			synth.onvoiceschanged = null;
			resolve();
		};

		synth.getVoices();
	});
}

async function speakWebSpeechAPI(
	text: string,
	isSpeakingRef: React.MutableRefObject<boolean>,
): Promise<void> {
	return new Promise(async (resolve) => {
		if (typeof window === "undefined" || !window.speechSynthesis) {
			console.warn("[TTS] speechSynthesis not available");
			resolve();
			return;
		}

		// Warm up voices without blocking the user gesture chain.
		void preloadVoices();

		const synth = window.speechSynthesis;
		const voices = synth.getVoices();
		console.log(`[TTS] voices loaded: ${voices.length}`);
		const voice =
			voices.find((v) => v.lang.startsWith("en-") && v.localService) ??
			voices.find((v) => v.lang.startsWith("en-")) ??
			null;

		let settled = false;
		const settle = () => {
			if (settled) return;
			settled = true;
			isSpeakingRef.current = false;
			resolve();
		};

		const cleanupSpeech = () => {
			if (synth.speaking || synth.pending) {
				synth.cancel();
			}
			if (synth.paused) {
				synth.resume();
			}
		};

		const speakAttempt = (retryCount = 1) => {
			cleanupSpeech();

			const utterance = new SpeechSynthesisUtterance(text);
			// Keep a reference to the utterance to prevent garbage collection
			(window as any)._lastUtterance = utterance;

			utterance.rate = 1.1;
			utterance.pitch = 1;
			utterance.volume = 1;
			utterance.lang = "en-US";
			if (voice) {
				utterance.voice = voice;
				console.log(`[TTS] selected voice: ${voice.name} (${voice.lang})`);
			}

			console.log(
				`[TTS] speaking: "${text.substring(0, 60)}" (attempt ${2 - retryCount})`,
			);

			let started = false;
			const fallbackTimer = window.setTimeout(() => {
				if (!started) {
					console.warn("[TTS] did not start within 8s, falling back");
					settle();
				}
			}, 8000);

			const safetyTimer = window.setTimeout(() => {
				console.warn("[TTS] safety timeout reached (15s)");
				cleanupSpeech();
				settle();
			}, 15000);

			utterance.onstart = () => {
				console.log("[TTS] onstart");
				started = true;
				window.clearTimeout(fallbackTimer);
				isSpeakingRef.current = true;
			};

			const finish = () => {
				console.log("[TTS] finished");
				window.clearTimeout(fallbackTimer);
				window.clearTimeout(safetyTimer);
				settle();
			};

			utterance.onend = finish;
			utterance.onerror = (e) => {
				console.warn(`[TTS] utterance error: ${e.error}`);
				if (e.error === "canceled" && retryCount > 0) {
					console.warn("[TTS] canceled; retrying once after delay");
					window.clearTimeout(fallbackTimer);
					window.clearTimeout(safetyTimer);
					window.setTimeout(() => speakAttempt(retryCount - 1), 200);
					return;
				}
				finish();
			};

			synth.speak(utterance);
		};

		speakAttempt();
	});
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
	const isSpeakingRef = useRef(false);

	useEffect(() => {
		preloadVoices();
	}, []);

	const speak = useCallback(async (text: string): Promise<void> => {
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
