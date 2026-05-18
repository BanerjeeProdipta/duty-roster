# RAG Agent Implementation Plan

## Overview

This document describes the planned implementation path for a RAG-enabled roster agent.
It is a future feature, not a completed part of the current repository.

## Key phases

1. Package and service scaffolding
2. LLM provider and fallback setup
3. RAG document indexing and retrieval
4. Agent tools and execution logic
5. Backend and frontend integration
6. Validation, testing, and rollout

## Phase 1: package scaffolding

- Create a new package such as `packages/agent`.
- Add TypeScript configuration and workspace package manifest.
- Keep the package lightweight and workspace-aware.
- Document its purpose, exports, and test scripts.

## Phase 2: provider abstraction

- Define environment variables for primary and fallback LLM providers.
- Support a cloud model as primary and a local Ollama-style model as fallback.
- Build an abstraction that can switch providers cleanly.
- Ensure the backend can run without a cloud key when fallback is available.

## Phase 3: RAG pipeline

- Add a vector store layer for roster context.
- Index documents such as assignments, nurse preferences, coverage rules, and policy notes.
- Use embeddings to retrieve relevant context for a user query.
- Keep retrieval implementation compatible with Cloudflare Workers limitations.

## Phase 4: agent tools

- Implement tool calls for roster actions such as:
  - `updateShift`
  - `getCoverage`
  - `queryRoster`
  - `getNurseByDate`
- Keep tool outputs structured so the frontend can render follow-up prompts and confirm changes.
- Include a safe fallback path for unrecognized or ambiguous requests.

## Phase 5: integration

- Add a backend endpoint for the agent.
- Connect the frontend voice/chat UI to the agent service.
- Preserve the current rule-based voice flow until the agent is ready.
- Validate that the agent can handle both command updates and informational queries.

## Phase 6: testing and rollout

- Add unit tests for provider selection, retrieval, and tool dispatch.
- Add integration tests for the agent endpoint and frontend interaction.
- Document required environment variables and setup steps.

## Implementation constraints

- Existing repo does not currently contain a `packages/agent` package.
- The design should avoid adding direct database queries inside the LLM prompt.
- Current backend is Cloudflare Workers compatible, so runtime-specific clients should be avoided.
