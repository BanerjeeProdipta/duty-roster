"use client";

import { useCallback, useRef } from "react";

interface UseSpeechSynthesisReturn {
  speak: (text: string) => Promise<void>;
  isSpeakingRef: React.MutableRefObject<boolean>;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const isSpeakingRef = useRef(false);

  const speak = useCallback((text: string): Promise<void> => {
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
  }, []);

  return {
    speak,
    isSpeakingRef,
  };
}