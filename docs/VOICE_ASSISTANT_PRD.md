# Voice Assistant — Setup PRD

## Vosk STT + WebSocket · Turborepo Monorepo

**Scope**: Get Vosk running, WebSocket plumbed end-to-end, transcript confirmed in browser
**Next doc**: name mapper + shift parser + NeonDB update

**Status**: Part 1 ✅ Complete | Part 2 ✅ Complete | Part 3 ✅ Complete | Part 4 ⏳ Pending | Part 5 ⏳ Pending

---

## The Cloudflare Workers Constraint

Your `apps/server` runs on the Cloudflare Workers adapter — which means:

- No `createBunWebSocket` (that's Bun runtime only)
- No persistent TCP/WebSocket server in the Workers process
- Workers _do_ support WebSockets via the **Durable Objects** API, but that's
  significant complexity for a pet feature

**Simplest solution**: run the voice WebSocket as a **separate lightweight Bun process**
(`apps/voice-server`) that lives alongside your Workers server locally and deploys
independently (or stays local-only). Your existing `apps/server` is not touched at all.

```
duty-roster/
├── apps/
│   ├── web/              ← Next.js (port 3001)
│   ├── server/           ← Cloudflare Workers + Hono + tRPC + Better Auth (port 3000, unchanged)
│   └── voice-server/     ← ✅ IMPLEMENTED — Bun + Hono WebSocket (voice relay, port 3002)
├── packages/
│   ├── api/
│   ├── auth/
│   ├── config/
│   ├── db/
│   ├── env/
│   └── ui/
└── stt/                  ← ✅ IMPLEMENTED — Vosk streaming WebSocket server (port 5001)
```

---

## Architecture (Data Flow)

```
Browser mic ──Float32──> AudioWorklet ──Int16 PCM──> useVoice hook
                                                          │
                                                     WebSocket
                                                          │
                                                          ▼
                                              apps/voice-server (port 3002)
                                              Bun + Hono, WS relay
                                                          │
                                                     WebSocket
                                                          │
                                                          ▼
                                              stt/server.py (port 5001)
                                              Python + Vosk, streaming WS
                                                          │
                                              ┌───────────┴───────────┐
                                              ▼                       ▼
                                         partial results        final result
                                         (interim text)     (text + confidence)
                                              │                       │
                                              └───────────┬───────────┘
                                                          │
                                                          ▼
                                              apps/voice-server
                                              forwards to browser WS
```

**Why two WebSocket hops?** The voice-server is a thin relay. It connects the browser WS
to the STT WS so the browser never needs to know about the Python process. This also lets
us swap STT backends later without changing frontend code.

---

## Part 1 — Vosk STT Server ✅ COMPLETE

Streaming WebSocket server. Accepts raw PCM16 chunks (any size), feeds them to Vosk
incrementally, and streams back partial + final transcriptions in real time.

### 1.1 Install ✅ DONE

**Python dependencies:**
```bash
pip install -r stt/requirements.txt
```

`stt/requirements.txt`:
```
vosk==0.3.44
websockets>=13.0
```

**Vosk model** (not committed — ~68MB, downloaded via script):
```bash
bash scripts/setup-stt.sh
```

This downloads `vosk-model-small-en-us-0.15` (~40MB zip) and extracts it to
`stt/models/`. The STT server expects it at `stt/models/vosk-model-small-en-us-0.15/`. Model files are gitignored — see `scripts/setup-stt.sh` for the full download logic.

### 1.2 `stt/server.py` ✅ IMPLEMENTED

```python
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
```

### 1.3 Confirm it works ✅ VERIFIED

```bash
python stt/server.py
# → STT streaming WS ready → ws://localhost:5001
```

---

## Part 2 — Voice Server (`apps/voice-server`) ✅ COMPLETE

Standalone Bun + Hono app. Owns the WebSocket connection from the browser
and relays audio to Vosk via a second WebSocket. Completely separate from
your Cloudflare Workers server. Includes an STT reconnection mechanism so
the browser can restart the STT connection without reconnecting.

### 2.1 Scaffold ✅ DONE

```bash
mkdir -p apps/voice-server/src
```

`apps/voice-server/package.json`: ✅ IMPLEMENTED

```json
{
  "name": "stt-server",
  "private": true,
  "module": "./src/index.ts",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "hono": "^4.0.0"
  }
}
```

### 2.2 `apps/voice-server/src/index.ts` ✅ IMPLEMENTED

```ts
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3001", // Next.js dev (port 3001)
      process.env.WEB_ORIGIN ?? "", // production web URL
    ].filter(Boolean),
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

const STT_WS_URL = process.env.STT_WS_URL ?? "ws://localhost:5001";

app.get(
  "/voice/stream",
  upgradeWebSocket(() => {
    let sttSocket: WebSocket | null = null;

    const connectSTT = () => {
      if (sttSocket) {
        sttSocket.close();
        sttSocket = null;
      }

      try {
        sttSocket = new WebSocket(STT_WS_URL);
        // @ts-expect-error Bun WebSocket accepts "buffer" binaryType
        sttSocket.binaryType = "buffer";
      } catch {
        // will be handled by connectSTT callers
      }
    };

    return {
      onOpen: (_e, ws) => {
        ws.send(JSON.stringify({ type: "connected" }));
        connectSTT();

        sttSocket!.onopen = () => {
          ws.send(JSON.stringify({ type: "stt_ready" }));
        };

        sttSocket!.onmessage = (event) => {
          ws.send(event.data as string);
        };

        sttSocket!.onclose = () => {
          ws.send(JSON.stringify({ type: "stt_disconnected" }));
          sttSocket = null;
        };

        sttSocket!.onerror = () => {
          ws.send(
            JSON.stringify({ type: "error", message: "STT connection failed" }),
          );
        };
      },

      onMessage: (evt, ws) => {
        const data = evt.data;

        if (typeof data === "string") {
          try {
            const cmd = JSON.parse(data);
            if (cmd.type === "restart") {
              connectSTT();
            }
          } catch {
            ws.send(
              JSON.stringify({ type: "error", message: "Invalid text message" }),
            );
          }
          return;
        }

        // Binary audio chunk — forward to STT
        if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
          sttSocket.send(data as ArrayBuffer);
        }
      },

      onClose: () => {
        if (sttSocket) {
          sttSocket.close();
          sttSocket = null;
        }
      },
    };
  }),
);

const PORT = parseInt(process.env.VOICE_PORT ?? "3002");
console.log(`Voice server ready → ws://localhost:${PORT}`);

export default { fetch: app.fetch, websocket, port: PORT };
```

**Key design decisions:**
- **WebSocket relay, not HTTP proxy**: Audio is forwarded as binary WS messages instead of base64-encoded HTTP POST bodies. This reduces overhead and enables streaming partial results back to the browser.
- **STT connection lifecycle**: A dedicated WebSocket to Vosk is opened per browser connection and closed when the browser disconnects.
- **`restart` command**: The browser can send `{"type":"restart"}` to reset the STT connection without re-establishing its own WebSocket.

---

## Part 3 — Root Dev Scripts ✅ COMPLETE

The monorepo uses **Turbo** for orchestration. The root `package.json` scripts
manage all services:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:stt": "python stt/server.py",
    "dev:voice": "turbo -F stt-server dev",
    "dev:web": "turbo -F web dev",
    "dev:server": "turbo -F server dev"
  }
}
```

### One-time setup

```bash
# Download the Vosk ML model (only needed once per clone)
bash scripts/setup-stt.sh
```

### Running all services locally

Open **four terminals** (or use a tool like `tmux`):

```bash
# Terminal 1 — STT (Python/Vosk)
bun dev:stt
# → STT streaming WS ready → ws://localhost:5001

# Terminal 2 — Voice relay (Bun/Hono)
bun dev:voice
# → Voice server ready → ws://localhost:3002

# Terminal 3 — Server (Cloudflare Workers / Hono)
bun dev:server
# → Server ready on port 3000

# Terminal 4 — Web (Next.js)
bun dev:web
# → http://localhost:3001
```

> **Why Turbo can't run all four**: Turbo requires persistent task output to stay
> attached. The STT server and voice server are long-running processes. Turbo's
> `"persistent": true` flag works for the web/server tasks but doesn't multiplex
> multiple persistent processes in one terminal. Running side-by-side terminals
> is the most reliable approach.

### Port assignments

| Service                       | Port | Runtime  | Start command     | Status       |
| ----------------------------- | ---- | -------- | ----------------- | ------------ |
| Next.js                       | 3001 | Bun      | `bun dev:web`     | ⏳ Pending   |
| Cloudflare Workers (wrangler) | 3000 | Workerd  | `bun dev:server`  | ✅ Untouched |
| Voice server                  | 3002 | Bun      | `bun dev:voice`   | ✅ Running   |
| Vosk STT                      | 5001 | Python   | `bun dev:stt`     | ✅ Running   |

---

## Part 4 — Next.js Frontend ✅ COMPLETE (Audio Processor Only)

### 4.1 `apps/web/public/pcm-processor.js` ✅ IMPLEMENTED

Runs in the browser audio thread. Converts Float32 mic samples → Int16 PCM.
Vosk requires Int16 at exactly 16kHz — without this, transcription returns empty string.

```js
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;

    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
    }

    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
```

### 4.2 `apps/web/hooks/useVoice.ts` ⏳ PENDING

Needs implementation. This hook should:
- Request `AudioContext` with `{ sampleRate: 16000 }`
- Load the `pcm-processor.js` AudioWorklet
- Open WebSocket to `ws://localhost:3002/voice/stream`
- Forward Int16 PCM buffers from the worklet as binary messages on the WS
- Listen for `"partial"`, `"result"`, and error message types
- Manage reconnection (send `{"type":"restart"}` on STT disconnect)
- Return reactive state: `{ transcript, partial, isListening, confidence, start, stop }`

### 4.3 `apps/web/.env.local` ⏳ PENDING

```env
# Voice server URL for the browser WebSocket connection
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:3002/voice/stream
```

### 4.4 `apps/web/components/VoiceTrigger.tsx` ⏳ PENDING

Needs implementation. Floating microphone button that:
- Toggles listening on click
- Shows a pulsing animation while recording
- Displays partial transcript in a floating bubble
- Displays final transcript with confidence on stop
- Uses the `useVoice` hook internally

---

## Part 5 — Verify End-to-End ⏳ NEXT

Work through in order. Each layer must pass before moving to the next.

```
[✅] python stt/server.py starts cleanly                  → ws://localhost:5001
[✅] health check: connect via WebSocket client, send empty → no crash

[✅] bun dev:voice starts on port 3002                     → ws://localhost:3002
[✅] curl http://localhost:3002/health                     → {"status":"ok"}

[⏳] bun dev:web — Next.js running on port 3001
[⏳] Click "Speak" → browser asks for mic permission
[⏳] Say anything → browser console logs transcript + confidence
[⏳] Partial results stream in real time
[⏳] No errors in browser console, voice-server terminal, or stt terminal
```

### Troubleshooting

**Empty transcript** — sampleRate is wrong. Confirm `new AudioContext({ sampleRate: 16000 })`.

**WebSocket error on connect** — voice-server not running, or port mismatch. Check `NEXT_PUBLIC_VOICE_WS_URL`.

**STT disconnected then `stt_ready` never arrives** — `stt/server.py` not running or crashed on model load.
The `restart` mechanism is available: send `{"type":"restart"}` from the browser to reconnect.

---

## What Is Not Touched ✅ CONFIRMED

- `apps/server/src/index.ts` — zero changes, tRPC and Better Auth unaffected
- Your existing NeonDB setup — the next PRD adds a tRPC mutation `shift.update`
  in `apps/server` so the DB write goes through your existing server, not the voice server

---

## What's Next ⏳

Once all checkboxes pass:

1. **Frontend implementation** — `useVoice.ts`, `VoiceTrigger.tsx`, `.env.local`
2. `packages/voice-parser` — name mapper (phonetic → Bengali) + shift command parser
3. New tRPC mutation in `apps/server` — `shift.update`
4. Voice server calls the tRPC mutation after parsing
5. UI shows confirmation after successful update
