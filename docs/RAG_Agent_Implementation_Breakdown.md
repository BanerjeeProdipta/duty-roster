# RAG Agent Implementation Plan

## Overview

Replace the current rule-based voice parser (`commandParser.ts` + `voice-parser`) with a LangGraph-powered agent backed by RAG over pgvector. The agent handles both **informational queries** ("what shift is Margaret on 25?") and **shift mutations** ("put Margaret on morning on 25") through a state-machine workflow with structured tool calls, confirmation flows, and TTS feedback.

## Architecture

```
User text → POST /api/agent → LangGraph agent → tools → structured response → TTS + display
```

### Agent Graph

```
                    ┌─────────────┐
                    │  analyze    │  LLM extracts intent + entities
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  retrieve   │  RAG: query pgvector for context
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  execute    │  Call tools (querySchedule, updateShift, etc.)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  respond    │  LLM formats final answer
                    └──────┬──────┘
                           │
                     Return to client
```

### Multi-turn flows

For **set commands**, the agent requests confirmation:

```
User: "put Margaret on morning on 25"
  → analyze: intent=update, nurse=Margaret, shift=morning, date=25
  → execute: requires confirmation, returns confirmation prompt
  → respond: "Do you want to set Margaret to morning on May 25?"
User: "yes"
  → analyze: intent=confirm
  → execute: calls updateShift tool
  → respond: "Done! Margaret is now on morning shift on May 25"
```

For **queries**:

```
User: "what shift is Margaret on 25"
  → analyze: intent=query, nurse=Margaret, date=25
  → retrieve: RAG context (nurse ID mapping, shift definitions)
  → execute: calls querySchedule(nurseName, date) → returns shift info
  → respond: "Margaret is on morning shift on May 25"
```

---

## Package: `packages/agent/`

New workspace package with LangChain/LangGraph. Deployed as part of the existing Hono server in `apps/server/` (Cloudflare Workers compatible).

### Dependencies

| Package | Purpose | CF Workers compatible |
|---------|---------|-----------------------|
| `@langchain/core` | Base abstractions (messages, tools, LLMs) | Yes |
| `@langchain/langgraph` | State machine / agent graph | Yes |
| `@langchain/openai` | OpenAI chat + embeddings | Yes |
| `zod` | Tool input schemas | Already in workspace |
| `@Duty-Roster/api` | Existing service layer (getSchedules, updateShift) | Already compatible |
| `@Duty-Roster/db` | Direct DB access for RAG indexing | Already compatible |

### Directory structure

```
packages/agent/src/
├── index.ts                  # Public exports
├── types.ts                  # AgentState, Config, tool result types
├── graph.ts                  # LangGraph state graph builder
├── nodes/
│   ├── analyze.ts            # LLM intent + entity extraction
│   ├── retrieve.ts           # RAG context retrieval from pgvector
│   ├── execute.ts            # Tool dispatch node
│   └── respond.ts            # Response formatting node
├── tools/
│   ├── index.ts              # Tool definitions array
│   ├── query-schedule.ts     # getSchedules wrapper
│   ├── update-shift.ts       # updateShift wrapper
│   ├── list-nurses.ts        # Nurse name → ID resolution
│   └── ask-clarification.ts  # Missing field prompts
├── rag/
│   ├── index.ts              # RAG pipeline setup
│   ├── embeddings.ts         # Embedding model (OpenAI primary, local fallback)
│   ├── vector-store.ts       # pgvector integration via Drizzle
│   ├── documents.ts          # Document preparation for indexing
│   └── index-docs.ts         # One-shot indexing script
└── llm/
    ├── index.ts              # LLM provider abstraction
    └── providers.ts          # OpenAI / Ollama implementations
```

### Types (`types.ts`)

```typescript
import type { BaseMessage } from "@langchain/core/messages";

export interface RosterContext {
  nurseName: string;
  nurseId: string;
  date?: string;
  dateKey?: string;
  shiftType?: string;
}

export interface AgentState {
  messages: BaseMessage[];
  intent: "query" | "update" | "confirm" | "cancel" | "unknown" | null;
  context: RosterContext | null;
  ragContext: string;
  toolResults: Record<string, unknown>;
  needsConfirmation: boolean;
  response: string | null;
}

export interface AgentConfig {
  openaiApiKey?: string;
  openaiModel?: string;        // default: gpt-4o-mini
  ollamaBaseUrl?: string;      // default: http://localhost:11434
  ollamaModel?: string;        // default: llama3.2
  embeddingModel?: string;     // default: text-embedding-3-small
  ragTopK?: number;            // default: 5
}
```

---

## Phase 1: Package scaffolding

### Tasks

1. Create `packages/agent/` with:
   - `package.json` — workspace package, depends on `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`, `@Duty-Roster/api`, `@Duty-Roster/db`
   - `tsconfig.json` — extend workspace config
   - `src/index.ts` — re-export builder function

2. Add `@langchain/core`, `@langchain/langgraph`, `@langchain/openai` to workspace catalog in root `package.json`

3. Files to create:
   - `packages/agent/src/types.ts` — AgentState, RosterContext, AgentConfig
   - `packages/agent/src/llm/index.ts` — Provider factory
   - `packages/agent/src/llm/providers.ts` — OpenAI + Ollama wrappers

### LLM provider design

```typescript
// packages/agent/src/llm/index.ts
export function createLLM(config: AgentConfig) {
  if (config.openaiApiKey) {
    return new ChatOpenAI({
      model: config.openaiModel ?? "gpt-4o-mini",
      apiKey: config.openaiApiKey,
    });
  }
  // Fallback to Ollama
  return new ChatOllama({
    model: config.ollamaModel ?? "llama3.2",
    baseUrl: config.ollamaBaseUrl ?? "http://localhost:11434",
  });
}
```

Env vars consumed by the server that creates the agent:
- `OPENAI_API_KEY` — primary provider
- `OPENAI_MODEL` — defaults to `gpt-4o-mini`
- `OLLAMA_BASE_URL` — fallback provider URL
- `OLLAMA_MODEL` — defaults to `llama3.2`

---

## Phase 2: RAG pipeline

### Overview

Index roster data into pgvector so the agent can retrieve relevant context (nurse names, shift definitions, current assignments, policy notes) at inference time.

### Documents to index

| Document type | Content | Update frequency |
|--------------|---------|-----------------|
| Nurse directory | Name, ID, active status | When nurses change |
| Shift definitions | Name, start/end times, crosses midnight | Rare (static) |
| Current schedule | Per-nurse-per-date assignments for current month | Monthly / on change |
| Roster policies | Coverage rules, weekend rotation, shift caps | Rare (static docs) |

### Embedding model

- **Primary**: `text-embedding-3-small` (OpenAI API, 512 dimensions)
- **Fallback**: local model via Ollama (e.g., `nomic-embed-text`)

### Vector store

Use pgvector directly via Drizzle ORM (no LangChain vector store wrapper needed, reduces deps):

```typescript
// packages/agent/src/rag/vector-store.ts
// Schema: agent_documents table
export const agentDocuments = pgTable("agent_documents", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  embedding: vector("embedding", { dimensions: 512 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create HNSW index for fast ANN search
// CREATE INDEX ON agent_documents USING hnsw (embedding vector_cosine_ops);
```

### Retrieval

```typescript
// packages/agent/src/rag/retrieve.ts
async function retrieveContext(query: string, topK = 5): Promise<string> {
  const embedding = await embedQuery(query);
  const results = await db
    .select()
    .from(agentDocuments)
    .orderBy(sql`embedding <=> ${embedding}::vector`)
    .limit(topK);
  return results.map(r => r.content).join("\n\n");
}
```

### Indexing script

One-off script at `packages/agent/src/rag/index-docs.ts` that:
1. Fetches all nurses, shifts, current schedule from DB
2. Generates embeddings via configured provider
3. Upserts into `agent_documents` table
4. Can be rerun on demand (e.g., monthly for new schedule)

---

## Phase 3: Agent graph

### State machine (`graph.ts`)

```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { AgentState } from "./types";
import { analyzeNode } from "./nodes/analyze";
import { retrieveNode } from "./nodes/retrieve";
import { executeNode } from "./nodes/execute";
import { respondNode } from "./nodes/respond";

function routeAfterAnalyze(state: AgentState): string {
  if (state.intent === "unknown") return "respond";
  return "retrieve";
}

function routeAfterExecute(state: AgentState): string {
  if (state.needsConfirmation) return "respond"; // wait for user
  return "respond";
}

export function buildAgent() {
  const workflow = new StateGraph<AgentState>({
    channels: { messages, intent, context, ragContext, toolResults, needsConfirmation, response },
  })
    .addNode("analyze", analyzeNode)
    .addNode("retrieve", retrieveNode)
    .addNode("execute", executeNode)
    .addNode("respond", respondNode)
    .addEdge("__start__", "analyze")
    .addConditionalEdges("analyze", routeAfterAnalyze, {
      retrieve: "retrieve",
      respond: "respond",
    })
    .addEdge("retrieve", "execute")
    .addConditionalEdges("execute", routeAfterExecute, {
      respond: "respond",
    })
    .addEdge("respond", END);

  return workflow.compile();
}
```

### Nodes

#### `analyze.ts` — Intent + entity extraction

Uses LLM to classify the user message:
- Intent: `query` | `update` | `confirm` | `cancel` | `unknown`
- Entities: nurse name, shift type, date expression, date key
- Output: structured `RosterContext` on `state.context`

Prompt template:
```
You are a roster assistant. Given a user message, extract:
- Intent (query | update | confirm | cancel | unknown)
- Nurse name (if mentioned)
- Shift type (morning/evening/night/off — if mentioned)
- Date (normalize to YYYY-MM-DD, use current month/year as default)
- if intent is confirm/cancel, mark needsConfirmation flag

Current date: {currentDate}
Available shifts: morning, evening, night, off
Available nurses: {nurseNames}

User: {userMessage}
```

#### `retrieve.ts` — RAG context injection

Calls `retrieveContext()` from the RAG pipeline to fetch relevant documents from pgvector. Injects the retrieved text into `state.ragContext` for the next node.

#### `execute.ts` — Tool dispatch

Routes based on `state.intent`:

| Intent | Tool | Behavior |
|--------|------|----------|
| `query` | `querySchedule` | Calls `getSchedules` via API service, returns assignment |
| `update` | `updateShift` | Sets `needsConfirmation=true`, stores intent for next turn |
| `confirm` | `updateShift` | Executes the pending update via API service |
| `cancel` | (none) | Clears pending intent, returns cancellation message |

#### `respond.ts` — Response formatting

Uses LLM to format the final response based on tool results and the original query. Output goes to `state.response`.

---

## Phase 4: Tools

### `query-schedule.ts`

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { rosterService } from "@Duty-Roster/api";

export const queryScheduleTool = tool(
  async ({ dateKey, nurseName }) => {
    const data = await rosterService.getSchedulesByDateRange(
      new Date(dateKey),
      new Date(dateKey),
    );
    const nurse = data.nurseRows.find(n => n.nurse.name === nurseName);
    if (!nurse) return `No nurse found with name "${nurseName}"`;
    const assignment = nurse.assignments[dateKey];
    if (!assignment) return `${nurseName} has no assignment on ${dateKey}`;
    return `${nurseName} is on ${assignment.shiftType} shift on ${dateKey}`;
  },
  {
    name: "querySchedule",
    description: "Get a nurse's shift assignment for a specific date",
    schema: z.object({
      dateKey: z.string().describe("Date in YYYY-MM-DD format"),
      nurseName: z.string().describe("Full nurse name"),
    }),
  },
);
```

### `update-shift.ts`

```typescript
export const updateShiftTool = tool(
  async ({ dateKey, nurseName, shiftType }) => {
    // 1. Look up nurse ID
    const nurses = await rosterService.getNurses();
    const nurse = nurses.find(n => n.name === nurseName);
    if (!nurse) return `Nurse "${nurseName}" not found`;

    // 2. Get existing schedule to find the ID
    const data = await rosterService.getSchedulesByDateRange(
      new Date(dateKey),
      new Date(dateKey),
    );
    const row = data.nurseRows.find(n => n.nurse.id === nurse.id);
    const assignment = row?.assignments[dateKey];

    // 3. Upsert
    const shiftId = shiftType === "off" ? null : `shift_${shiftType}`;
    await rosterService.upsertSchedule(
      assignment?.id ?? "",
      shiftId,
      nurse.id,
      dateKey,
    );
    return `${nurseName} was updated to ${shiftType} on ${dateKey}`;
  },
  { name: "updateShift", ... },
);
```

### `list-nurses.ts`

Returns all active nurse names for entity resolution in the `analyze` node prompt.

### `ask-clarification.ts`

Returns a structured prompt asking the user for missing fields (nurse name, shift, date). Used when `analyze` can't extract all required entities.

---

## Phase 5: Backend endpoint

Add a new route to the existing Hono server (`apps/server/src/index.ts`):

```typescript
import { buildAgent } from "@Duty-Roster/agent";

const agent = buildAgent({ /* config from env */ });

app.post("/api/agent", async (c) => {
  const { text, conversationId } = await c.req.json();

  const result = await agent.invoke({
    messages: [{ role: "user", content: text }],
    intent: null,
    context: null,
    ragContext: "",
    toolResults: {},
    needsConfirmation: false,
    response: null,
  });

  return c.json({
    response: result.response,
    intent: result.intent,
    needsConfirmation: result.needsConfirmation,
    context: result.context,
  });
});
```

### Error handling

- Return `{ error: "..." }` for API/LLM failures
- Client-side fallback to rule-based parser if agent returns error
- Timeout after 30 seconds

---

## Phase 6: Frontend integration

Replace the rule-based path with the agent API call:

### `useVoiceAssistantLogic.ts` changes

```typescript
const processMessage = useCallback(async (text: string) => {
  const res = await fetch("/api/agent", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  const data = await res.json();

  if (data.needsConfirmation) {
    // Show confirmation prompt (same as current UI)
    askForConfirmation(data.context);
  } else {
    // Show response + TTS
    setMessages(prev => [...prev, { raw: data.response, isSystem: true }]);
    speakSafely(data.response);
  }
}, []);
```

### Phased rollout

1. Phase A: Agent handles **queries only** — `commandParser.ts` still handles set commands
2. Phase B: Agent handles **set commands** with confirmation flow
3. Phase C: Remove `commandParser.ts` and `packages/voice-parser`

---

## Phase 7: Testing

### Unit tests
- `llm/provider.test.ts` — Provider selection logic
- `tools/query-schedule.test.ts` — Tool call with mock API
- `tools/update-shift.test.ts` — Tool call with mock API
- `nodes/analyze.test.ts` — Intent extraction with test prompts
- `rag/retrieve.test.ts` — pgvector query with test embeddings

### Integration tests
- Agent graph end-to-end with mock LLM
- `/api/agent` endpoint with real DB (test database)
- Frontend → agent → response round trip

### Environment
- Tests run against a local PostgreSQL test database
- Vector extension must be enabled (already done)
- LLM calls mocked at the HTTP layer

---

## Configuration

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No* | — | Primary LLM provider key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model for chat + analysis |
| `OPENAI_EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Fallback LLM URL |
| `OLLAMA_MODEL` | No | `llama3.2` | Fallback model |
| `AGENT_RAG_TOP_K` | No | `5` | Number of RAG documents to retrieve |

\* Required unless Ollama fallback is configured.

### Runtime capability

| Scenario | Works? |
|----------|--------|
| Local dev (Bun) with OpenAI | Yes |
| Local dev (Bun) with Ollama | Yes |
| Cloudflare Workers with OpenAI | Yes |
| Cloudflare Workers with Ollama | No — Ollama runs externally, call via fetch |
| No LLM available | Falls back to current rule-based parser |

---

## Implementation constraints (updated)

- ✅ `pgvector` extension is enabled in both local (0.8.2) and Neon (0.8.1) databases
- ✅ `pgvector` npm package (v0.2.1) is installed in `packages/db`
- Migration file at `packages/db/src/migrations/0001_pink_vector.sql` enables the extension
- `packages/agent/` does not yet exist — must be created
- `@langchain/core`, `@langchain/langgraph`, `@langchain/openai` must be added to workspace catalog
- Agent runs on Cloudflare Workers via `apps/server` — avoid Node-specific APIs
- Agent tools should reuse existing service functions from `packages/api/src/roster/` rather than calling the DB directly
- Current rule-based parser kept as fallback until agent is stable
