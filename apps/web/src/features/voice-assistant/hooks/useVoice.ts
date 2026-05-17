"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

const WS_URL =
  process.env.NEXT_PUBLIC_VOICE_WS_URL ?? "ws://localhost:3002/voice/stream";

interface UseVoiceReturn {
  transcript: string;
  partial: string;
  isListening: boolean;
  ready: boolean;
  confidence: number;
  levels: number[];
  error: string;
  start: () => void;
  stop: () => void;
}

function log(...args: unknown[]) {
  console.log(`[Voice ${new Date().toISOString()}]`, ...args);
}

function cleanupResources(
  workerNode: AudioWorkletNode | null,
  source: MediaStreamAudioSourceNode | null,
  audioCtx: AudioContext | null,
  stream: MediaStream | null,
  ws: WebSocket | null,
): void {
  if (workerNode) {
    workerNode.disconnect();
  }
  if (source) {
    source.disconnect();
  }
  if (audioCtx && audioCtx.state !== "closed") {
    audioCtx.close();
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    ws.close();
  }
}

export function useVoice(): UseVoiceReturn & { error: string } {
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [ready, setReady] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(25).fill(0));
  const [error, setError] = useState("");

  const { speak } = useSpeechSynthesis();

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workerNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const startingRef = useRef(false);
  const greetedRef = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const cleanup = useCallback(() => {
    log("cleanup");
    if (silenceRef.current) clearTimeout(silenceRef.current);
    silenceRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    analyserRef.current = null;
    cleanupResources(
      workerNodeRef.current,
      sourceRef.current,
      audioCtxRef.current,
      streamRef.current,
      wsRef.current,
    );
    workerNodeRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
    startingRef.current = false;
    setIsListening(false);
    setReady(false);
    setLevels(Array(25).fill(0));
    greetedRef.current = false;
    setError("");
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stop = useCallback(() => {
    log("stop");
    if (silenceRef.current) clearTimeout(silenceRef.current);
    silenceRef.current = null;
    cleanup();
    setPartial("");
  }, [cleanup]);

  stopRef.current = stop;

  function setupMic(ws: WebSocket) {
    ws.onopen = async () => {
      log("ws open");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        streamRef.current = stream;
        log("mic stream acquired");

        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        await audioCtx.audioWorklet.addModule("/pcm-processor.js");
        log("audio worklet loaded");

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
        workerNodeRef.current = workletNode;

        workletNode.port.onmessage = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        source.connect(workletNode);

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const BAR_COUNT = 25;

        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          const next = Array.from({ length: BAR_COUNT }, (_, i) => {
            const startBin = Math.floor((i / BAR_COUNT) * bufferLength);
            const endBin = Math.floor(((i + 1) / BAR_COUNT) * bufferLength);
            let sum = 0;
            for (let j = startBin; j < endBin; j++) {
              sum += dataArray[j]! / 255;
            }
            return Math.min(1, sum / (endBin - startBin));
          });
          setLevels(next);
          rafRef.current = requestAnimationFrame(update);
        };
        rafRef.current = requestAnimationFrame(update);

        startingRef.current = false;
        setIsListening(true);
        log("listening started");

        if (silenceRef.current) clearTimeout(silenceRef.current);
        silenceRef.current = setTimeout(() => {
          log("silence timeout — auto-stopping");
          stopRef.current();
        }, 15000);
      } catch (err) {
        log("mic/audio setup failed", err);
        startingRef.current = false;
        ws.close();
        cleanupResources(
          workerNodeRef.current,
          sourceRef.current,
          audioCtxRef.current,
          streamRef.current,
          null,
        );
      }
    };

    function resetSilenceTimer(delay = 3000) {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => {
        log("silence timeout — auto-stopping");
        stopRef.current();
      }, delay);
    }

    ws.onmessage = (event) => {
      try {
        const raw = event.data as string;
        const data = JSON.parse(raw);
        log("ws message type=", data.type, data.text ? `text="${data.text}"` : "", data.confidence ? `conf=${data.confidence}` : "");
        switch (data.type) {
          case "connected": {
            log("voice server connected");
            break;
          }
          case "partial": {
            setPartial(data.text);
            resetSilenceTimer(3000);
            break;
          }
          case "result": {
            log("*** FINAL RESULT ***", data.text, data.confidence);
            setTranscript(data.text);
            setConfidence(data.confidence ?? 0);
            setPartial("");
            resetSilenceTimer(30000);
            break;
          }
          case "stt_ready": {
            log("*** STT READY ***");
            setReady(true);
            resetSilenceTimer(15000);
            break;
          }
          case "stt_disconnected": {
            log("stt disconnected — server will auto-retry");
            setReady(false);
            break;
          }
          case "error": {
            log("*** VOICE SERVER ERROR ***", data.message);
            setError(data.message);
            break;
          }
          default: {
            log("unhandled message type", data.type, raw);
          }
        }
      } catch {
        log("malformed ws message", event.data);
      }
    };

    ws.onclose = () => {
      log("ws closed");
      setIsListening(false);
      startingRef.current = false;
    };

    ws.onerror = (err) => {
      log("ws error", err);
      startingRef.current = false;
      cleanup();
    };
  }

  const start = useCallback(() => {
    if (wsRef.current || startingRef.current) {
      log("start skipped — already starting/started");
      return;
    }
    startingRef.current = true;
    log("start");

    setTranscript("");
    setPartial("");
    setConfidence(0);
    setReady(false);
    setError("");

    const afterGreeting = () => {
      setReady(true);
      if (startingRef.current === false) return;

      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      setupMic(ws);
    };

    if (greetedRef.current) {
      log("greeting already spoken, skipping");
      afterGreeting();
    } else {
      greetedRef.current = true;
      speak("Hey, how can I help?").then(afterGreeting);
    }
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    transcript,
    partial,
    isListening,
    ready,
    confidence,
    levels,
    error,
    start,
    stop,
  };
}
