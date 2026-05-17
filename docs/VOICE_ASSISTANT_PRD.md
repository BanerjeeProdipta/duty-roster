# Voice Assistant — System Overview

## Purpose

The voice assistant enables hands-free roster updates by converting speech into structured shift update commands.

## Current implementation

- `apps/web` captures microphone audio and sends it to `apps/voice-server`.
- `apps/voice-server` relays audio to the Python Vosk STT server at `stt/server.py`.
- The browser receives transcribed text and parses it with `parseCommand()`.
- Confirmations are requested before the final shift update is sent to the backend.

## Components

- `apps/web/src/features/voice-assistant/hooks/useVoiceAssistantLogic.ts`
  - Handles transcript processing, follow-up questions, and confirmation flow.
- `apps/web/src/features/voice-assistant/utils/commandParser.ts`
  - Extracts nurse name, shift type, and date from spoken text.
- `packages/voice-parser`
  - Provides Bengali and English name matching, date parsing, and phonetic utilities.
- `apps/voice-server/src/index.ts`
  - WebSocket relay between browser and STT server.
- `stt/server.py`
  - Vosk streaming STT receives PCM and returns partial/final transcripts.

## Supported workflow

1. User speaks a shift command.
2. Browser sends audio to `apps/voice-server`.
3. `apps/voice-server` forwards the audio to the STT server.
4. STT returns text to the browser.
5. The browser parses the text, asks for missing fields if needed, and requests confirmation.
6. The user confirms the update.
7. The browser sends the shift update through tRPC to the backend.

## Parsing strategy

- Current command parsing is rule-based and uses a fixed shift vocabulary.
- It supports Bengali and English nurse names via `packages/voice-parser`.
- It recognizes `morning`, `evening`, `night`, `off`, and date patterns.

## Text-to-speech

- The browser uses the native Web Speech API for spoken feedback.
- Echo suppression ignores transcripts while the assistant is speaking.

## Development setup

- `bun run dev:stt` — starts the Python Vosk STT server on `ws://localhost:5001`
- `bun run dev:voice` — starts the Bun voice relay server on `http://localhost:3002`
- `bun run dev:web` — starts the Next.js frontend

## Status

- Voice STT streaming is implemented.
- Rule-based parsing and confirmation flow are implemented.
- The current system has not yet been replaced by an LLM or RAG agent.
