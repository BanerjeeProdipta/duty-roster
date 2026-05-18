# RAG Agent — Future Design

## Purpose

Define a future RAG-enabled agent for natural language roster management and voice/chat interaction.

## Scope

This is a planned feature, not an existing implementation in the current repo.
The goal is to replace the current rule-based voice parser with an LLM-backed agent that can:

- understand varied natural language requests,
- answer roster queries,
- update shifts,
- swap or transfer shifts,
- confirm ambiguous commands,
- retrieve relevant roster context from a vector store.

## High-level architecture

- Frontend captures text from STT or chat input.
- Text is sent to a backend agent endpoint.
- The agent uses a retrieval layer over roster documents and/or current schedule state.
- The agent executes actions through structured tool calls.
- Responses are sent back to the browser for speech or chat display.

## Design goals

- Make voice and chat commands more robust than the current rule-based parser.
- Keep roster state authoritative in PostgreSQL.
- Use RAG to answer questions about current coverage, preferences, and assignments.
- Support fallback to offline or local LLMs if cloud APIs are unavailable.

## Notes

- The repo currently includes `packages/voice-parser`, but not a `packages/agent` implementation.
- This document should guide implementation once the LLM/RAG package is added.
