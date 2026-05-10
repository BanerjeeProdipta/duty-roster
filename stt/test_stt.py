#!/usr/bin/env python3
"""
Test script for the streaming STT WebSocket server.
"""

import asyncio
import json
import struct

import websockets


def create_dummy_pcm16(duration_seconds=1, sample_rate=16000, frequency=440):
    num_samples = duration_seconds * sample_rate
    audio_data = []
    for i in range(num_samples):
        sample = int(32767 * 0.3 * (i * frequency * 2 * 3.14159 / sample_rate))
        sample = max(-32768, min(32767, sample))
        audio_data.append(struct.pack("<h", sample))
    return b"".join(audio_data)


async def test_streaming():
    uri = "ws://localhost:5001"
    async with websockets.connect(uri) as ws:
        print(f"Connected to {uri}")

        audio = create_dummy_pcm16(duration_seconds=2)

        # Stream in 100ms chunks (1600 samples = 3200 bytes)
        chunk_size = 3200
        for i in range(0, len(audio), chunk_size):
            chunk = audio[i : i + chunk_size]
            await ws.send(chunk)

            try:
                response = await asyncio.wait_for(ws.recv(), timeout=0.05)
                data = json.loads(response)
                print(f"[{data['type']}] {data.get('text', '')}")
            except asyncio.TimeoutError:
                pass

        # Wait for any remaining results
        try:
            while True:
                response = await asyncio.wait_for(ws.recv(), timeout=0.5)
                data = json.loads(response)
                print(f"[{data['type']}] {data.get('text', '')}")
        except asyncio.TimeoutError:
            pass

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(test_streaming())
