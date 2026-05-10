#!/usr/bin/env python3
"""
Streaming STT server — accepts raw PCM16 chunks over WebSocket,
feeds them to Vosk incrementally, and streams back partial + final results.

WebSocket message protocol:
  → binary (raw PCM16 16kHz mono, any chunk size)
  ← {"type":"partial","text":"..."}
  ← {"type":"result","text":"...","confidence":0.95,"words":[...]}
  ← {"type":"error","message":"..."}
"""

import asyncio
import json
import struct

import websockets
from vosk import Model, KaldiRecognizer

MODEL_PATH = "stt/models/vosk-model-small-en-us-0.15"
SAMPLE_RATE = 16000

model = Model(MODEL_PATH)


async def handle(ws):
    rec = KaldiRecognizer(model, SAMPLE_RATE)
    rec.SetWords(True)

    async for message in ws:
        if isinstance(message, str):
            await ws.send(json.dumps({
                "type": "error",
                "message": "expected binary audio data",
            }))
            continue

        if rec.AcceptWaveform(message):
            result = json.loads(rec.Result())
            text = result.get("text", "")
            words = result.get("result", [])
            confidence = (
                sum(w.get("conf", 0) for w in words) / len(words)
                if words else 0.0
            )
            if text:
                await ws.send(json.dumps({
                    "type": "result",
                    "text": text,
                    "confidence": round(confidence, 2),
                    "words": words,
                }))
        else:
            partial = json.loads(rec.PartialResult())
            partial_text = partial.get("partial", "")
            if partial_text:
                await ws.send(json.dumps({
                    "type": "partial",
                    "text": partial_text,
                }))

    # Flush any remaining audio on disconnect
    final = json.loads(rec.FinalResult())
    text = final.get("text", "")
    if text:
        words = final.get("result", [])
        confidence = (
            sum(w.get("conf", 0) for w in words) / len(words)
            if words else 0.0
        )
        await ws.send(json.dumps({
            "type": "result",
            "text": text,
            "confidence": round(confidence, 2),
            "words": words,
        }))


async def main():
    async with websockets.serve(handle, "localhost", 5001):
        print("STT streaming WS ready → ws://localhost:5001")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
