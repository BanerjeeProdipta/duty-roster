# Voice Assistant — Setup PRD

## Vosk STT + WebSocket · Turborepo Monorepo

**Scope**: Get Vosk running, WebSocket plumbed end-to-end, transcript confirmed in browser
**Next doc**: name mapper + shift parser + NeonDB update

**Status**: Part 1 ✅ Complete | Part 2 ✅ Complete | Part 3 ✅ Complete | Part 4 ✅ Complete | Part 5 ✅ Complete | Part 6 🔄 In Progress

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
              JSON.stringify({
                type: "error",
                message: "Invalid text message",
              }),
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

| Service                       | Port | Runtime | Start command    | Status     |
| ----------------------------- | ---- | ------- | ---------------- | ---------- |
| Next.js                       | 3001 | Bun     | `bun dev:web`    | ✅ Running |
| Cloudflare Workers (wrangler) | 3000 | Workerd | `bun dev:server` | ✅ Running |
| Voice server                  | 3002 | Bun     | `bun dev:voice`  | ✅ Running |
| Vosk STT                      | 5001 | Python  | `bun dev:stt`    | ✅ Running |

---

## Part 4 — Next.js Frontend ✅ COMPLETE

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

### 4.2 `apps/web/src/features/voice-assistant/hooks/useVoice.ts` ✅ IMPLEMENTED

Fully implemented hook with:

- AudioContext at 16kHz with mono channel
- PCMProcessor AudioWorklet integration
- WebSocket connection to voice-server at `ws://localhost:3002/voice/stream`
- Binary PCM forwarding from worklet to WS
- `"partial"`, `"result"`, `"stt_ready"`, `"stt_disconnected"` message handling
- Auto-reconnection via `{"type":"restart"}` on STT disconnect
- Silence detection with 2-second auto-stop
- Real-time audio levels (frequency data visualization)
- TTS (Text-to-Speech) using Web Speech API with greeting on start
- Proper resource cleanup on stop/unmount

Returns: `{ transcript, partial, isListening, ready, confidence, levels, start, stop }`

### 4.3 `apps/web/.env.local` ✅ IMPLEMENTED

```env
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:3002/voice/stream
```

### 4.4 `apps/web/src/features/voice-assistant/components/VoiceTrigger.tsx` ✅ IMPLEMENTED

Floating microphone button with:

- Toggles listening on click (shows Bot icon when closed, mic controls when open)
- WaveAnimation visualization during recording
- Chat UI showing parsed commands (recognized vs unrecognized)
- Text input fallback for manual entry
- Extracted `MessageItem` component for message rendering
- Extracted `WaveAnimation` component for audio visualization

### 4.5 Modular Components ✅ IMPLEMENTED

**`MessageItem.tsx`** — Extracted component for rendering voice messages:
- Displays "Extracted" for recognized commands, "Unrecognized" otherwise
- Shows extracted fields: action, nurse name, shift, date
- Toggle button to show/hide raw transcript

**`utils/commandParser.ts`** — Extracted command parsing logic:
- `parseCommand(text)` - parses voice input for shift, date, nurse name, action
- Uses `packages/voice-parser` for name matching and date parsing
- `SHIFT_WORDS` constant: ["morning", "evening", "night", "off"]
- `SKIP_WORDS` constant: common words to filter out

---

## Part 5 — Verify End-to-End ✅ COMPLETE

All verification steps passed:

```
[✅] python stt/server.py starts cleanly                  → ws://localhost:5001
[✅] health check: connect via WebSocket client, send empty → no crash

[✅] bun dev:voice starts on port 3002                     → ws://localhost:3002
[✅] curl http://localhost:3002/health                     → {"status":"ok"}

[✅] bun dev:web — Next.js running on port 3001
[✅] Click voice trigger → browser asks for mic permission
[✅] Speak command → transcript appears in UI
[✅] Partial results stream in real time
[✅] TTS greeting plays on start
[✅] Auto-stop after 2 seconds of silence
[✅] Command parsing extracts: nurse name, shift, date
```

### Additional Features Implemented

- **Text input fallback** — Type commands instead of speaking
- **Speech synthesis** — "Hey, how can I help?" greeting via Web Speech API
- **Audio visualization** — Real-time frequency bars during recording
- **Toggle raw transcript** — Show/hide original voice input
- **Modular architecture** — Separation of concerns with extracted components

## Part 6 — Command Parsing & Action 🔄 IN PROGRESS

### Current State

The UI now displays extracted commands but doesn't execute any actions. The parsed command structure is:

```typescript
interface ParsedCommand {
  shift: string | null;      // "morning" | "evening" | "night" | "off"
  date: string | null;        // parsed date string
  nurseName: string | null;   // matched nurse name
  action: string | null;     // "update" when all fields present
}
```

### What's Pending

1. **tRPC mutation** — Add `shift.update` mutation in `apps/server`
2. **Execute action** — VoiceTrigger sends command to backend after user confirms
3. **Confirmation UI** — Show success/error after DB update
4. **Name mapping** — Full integration with `packages/voice-parser` for Bengali name matching

---

## What Is Not Touched ✅ CONFIRMED

- `apps/server/src/index.ts` — zero changes, tRPC and Better Auth unaffected
- Your existing NeonDB setup — the next PRD adds a tRPC mutation `shift.update`
  in `apps/server` so the DB write goes through your existing server, not the voice server

---

## What's Next ⏳

1. **Execute parsed commands** — Connect UI to backend via tRPC
2. **Add tRPC mutation** — `shift.update` in `apps/server`
3. **Confirmation UI** — Show success/error after DB write
4. **Voice-parser integration** — Full Bengali name matching
