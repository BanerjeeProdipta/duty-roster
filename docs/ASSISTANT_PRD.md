# Voice & AI Assistant — System Overview

## Purpose

Enable hands-free roster updates and queries via speech or chat. Speech is transcribed by Vosk STT, then processed by an LLM-backed agent that resolves names (English → Bengali) and executes structured tool calls against PostgreSQL.

## Architecture

```
Microphone ─► apps/voice-server ─► Vosk STT ─► transcript text
                                                   │
                                    normalizeText() (STT corrections)
                                           │
                                resolveNamesInText() (EN→BN name replacement)
                                           │
                                   POST /api/agent
                                           │
                                   LangGraph agent (Groq / llama-3.3-70b)
                                           │
                          ┌────────────────┼────────────────┐
                   querySchedule     queryShift        setShift
                   listNurses
                                           │
                                    Response text
                                           │
                              Display + TTS (Web Speech API)
```

## Components

### `apps/voice-server`
WebSocket relay between browser and Python Vosk STT server (`stt/server.py`). Receives PCM audio, forwards to Vosk, returns partial/final transcripts.

### `packages/agent`
LangGraph `createReactAgent` using Groq (`llama-3.3-70b-versatile`). Built by `buildAgent()` and invoked on POST `/api/agent` in `apps/server`.

**Tools:**

| Tool | Params | Description |
|------|--------|-------------|
| `querySchedule` | nurseName, dateKey | Get a nurse's shift on a date |
| `queryShift` | shiftName, dateKey | List nurses on a shift on a date |
| `listNurses` | (none) | All active nurses |
| `setShift` | nurseName, shiftName, dateKey | Assign/update a nurse's shift (upsert) |

The system prompt tells the LLM that nurse names are in Bengali and all tools accept Bengali or English names. The agent calls one tool per turn then responds immediately (no multi-turn confirmation flow).

Timeout: 15 seconds. Falls back to rule-based parser on error/timeout.

### `packages/ai-parser`

Provides name resolution utilities used by both the frontend pre-processing pipeline and agent tools:

- `PHONETIC_MAP` — English phonetic variants → Bengali names (e.g. `"joy three"` → `জয়শ্রী`)
- `DISPLAY_NAMES` — Bengali → English display names (for confirmation UI)
- `bestNameMatch(words)` — Fuzzy match word arrays against phonetic map (full-string, per-word, then n-gram passes)
- `resolveNamesInText(text)` — Scans text for phonetic keys (longest-first) and replaces with Bengali names using `\b` word boundaries
- `bengaliToEnglish(bn)` — Bengali name → English display name

Includes dummy entries (ডামি ১-৫) for development/testing.

### `apps/web/src/features/ai-assistant`

Frontend processing pipeline:

1. **`normalizeText(text)`** — Fixes common STT garbling via `STT_CORRECTIONS` map:
   - `schiff/schift/sheep` → `shift`
   - `kinnear` → `can you`
   - `"can u s"` / `"can u c"` → `can you set`
   - `"to eat thing"` / `"the thing"` → `evening`
   - etc.

2. **`resolveNamesInText(normalized)`** — Replaces English phonetic names with Bengali script

3. **`POST /api/agent`** — Sends resolved text to agent, displays response

4. **Fallback `parseCommand()`** — Rule-based parser if agent unavailable (extracts nurse/shift/date from SET commands only)

### `stt/server.py`

Python Vosk streaming speech-to-text server. Receives PCM audio over WebSocket, returns partial and final transcriptions.

## Data flow: set command

```
User: "set enjoy three to morning shift on twenty seventh"
  → STT: "set enjoy three to morning shift on twenty seventh"
  → normalizeText: "set enjoy three to morning shift on twenty seventh" (no corrections needed)
  → resolveNamesInText: "set জয়শ্রী to morning shift on twenty seventh"
  → POST /api/agent
  → agent.querySchedule(name=জয়শ্রী, shift=morning, date=2026-05-27) ... or ...
  → agent.setShift(nurseName=জয়শ্রী, shiftName=morning, dateKey=2026-05-27)
  → Response: "Updated: জয়শ্রী is now assigned to morning on 2026-05-27."
```

## Data flow: query command

```
User: "who is on morning shift today"
  → STT: "who is on morning shift today"
  → normalizeText: "who is on morning shift today"
  → resolveNamesInText: "who is on morning shift today" (no name found)
  → POST /api/agent
  → agent.queryShift(shiftName=morning, dateKey=2026-05-28)
  → Response: "The following nurses are on morning shift on 2026-05-28: ..."
```

If the agent times out or errors (15s), the frontend falls back to `parseCommand()`. Query intents are detected and return a helpful message rather than asking "which nurse?".

## Not implemented (future)

- **RAG / pgvector**: No vector store or document indexing exists yet
- **Multi-turn confirmation**: Agent updates directly — no "are you sure?" step
- **Ollama/OpenAI fallback**: LLM provider is hard-coded to Groq
- **Cloudflare Workers**: Agent runs in Node/Bun via `apps/server`, not Workers
- **Shift swap/transfer**: Only single-nurse single-date assignment is supported

## Key files

| Path | Role |
|------|------|
| `packages/agent/src/llm.ts` | Groq LLM factory (llama-3.3-70b) |
| `packages/agent/src/graph.ts` | LangGraph agent + system prompt |
| `packages/agent/src/tools/set-shift.ts` | Shift upsert tool |
| `packages/agent/src/tools/query-schedule.ts` | Nurse schedule lookup tool |
| `packages/agent/src/tools/query-shift.ts` | Shift roster query tool |
| `packages/agent/src/tools/list-nurses.ts` | Active nurse list tool |
| `apps/server/src/index.ts` | POST /api/agent endpoint |
| `packages/ai-parser/src/phonetic-map.ts` | EN↔BN name mappings |
| `packages/ai-parser/src/phonetic-names.ts` | bestNameMatch, resolveNamesInText, bengaliToEnglish |
| `apps/web/src/features/ai-assistant/hooks/useAIAssistantLogic.ts` | normaliseText, STT_CORRECTIONS, agent call + fallback |
| `apps/web/src/features/ai-assistant/hooks/useAIAssistantState.ts` | State management (pendingConfirmation, awaitingResponse) |
| `apps/web/src/features/ai-assistant/hooks/useConfirmShiftUpdate.ts` | Confirmation flow for rule-based fallback |
| `apps/web/src/features/ai-assistant/utils/commandParser.ts` | Rule-based parser (fallback) |
| `apps/web/src/features/ai-assistant/components/MessageItem.tsx` | Chat bubble UI (BotIcon, UserIcon) |

## Dev commands

- `bun run dev:stt` — Vosk STT server (`ws://localhost:5001`)
- `bun run dev:voice` — Voice relay (`http://localhost:3002`)
- `bun run dev:web` — Next.js frontend
- `bun run dev` — Full stack (server + web + voice + STT)

## Configuration

| Env var | Required | Description |
|---------|----------|-------------|
| `GROQ_API_KEY` | Yes | LLM provider key for agent |
| `NEXT_PUBLIC_SERVER_URL` | No | Agent endpoint base URL (default: `http://localhost:3000`) |
