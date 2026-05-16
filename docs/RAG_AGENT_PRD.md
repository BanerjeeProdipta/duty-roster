# RAG Agent — Shift Management PRD

## LLM Agent · LangChain · pgvector · Gemini → Ollama Fallback

**Scope**: Replace the rule-based `voice-parser` with a LangChain agent augmented by RAG (Retrieval-Augmented Generation) over all roster data. The agent understands natural language, retrieves relevant context from a vector store, and executes shift operations via tool calls.

**Status**: Draft

---

## The Problem

The current voice assistant uses a regex-based `parseCommand()` in `apps/web/src/features/voice-assistant/utils/commandParser.ts`. This approach has fundamental limitations:

| Limitation | Example that breaks |
|------------|-------------------|
| Exact word matching | "set Joysree to evening" vs "assign Joysree evening shift" |
| No synonym understanding | "put" works but "schedule" doesn't |
| Fixed word list only | SKIP_WORDS set with 40 words, misses many variations |
| No multi-turn naturally | The frontend manually tracks `accumulatedDataRef` across utterances |
| No query support | "Who's on night shift Friday?" can't be answered |
| No swap/transfer logic | "Swap my shift with Sarah's" requires separate UI |
| No ambiguity resolution | "Set her to morning" — can't resolve "her" |

An LLM agent solves all of these while adding context-aware reasoning via RAG.

---

## Architecture

```
                        ┌─────────────────────────────────────┐
                        │           Browser (Next.js)         │
                        │                                     │
                        │  Mic → Vosk STT → text              │
                        │       ↓                             │
                        │  tRPC: agent.processCommand(text)    │
                        │  ← { intent, fields, confirmation } │
                        │       ↓                             │
                        │  TTS speaks response                │
                        └──────────┬──────────────────────────┘
                                   │ tRPC
                                   ▼
           ┌───────────────────────────────────────────────┐
           │            apps/server (Hono/CF Workers)      │
           │                                               │
           │  ┌─────────────┐   ┌──────────────────────┐   │
           │  │ tRPC Router  │──▶│  Agent Service        │   │
           │  │             │   │  - LangChain Agent    │   │
           │  │             │   │  - Tools              │   │
           │  └─────────────┘   │  - LLM Provider       │   │
           │                    │  - RAG Retriever      │   │
           │                    └───────┬──────────────┘   │
           └────────────────────────────┼──────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
           ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
           │  Neon +      │   │  Google      │   │  Ollama      │
           │  pgvector    │   │  Gemini API  │   │  (fallback)  │
           │  (Postgres)  │   │  (free tier) │   │  localhost:  │
           │              │   │              │   │  11434       │
           └──────────────┘   └──────────────┘   └──────────────┘
```

### Data Flow

```
1. User speaks → Vosk STT → text transcript
2. Frontend sends text to tRPC: agent.processCommand({ text })
3. Server LangChain agent:
   a. Decides intent (update/query/swap/check/unknown)
   b. If RAG needed → embed query → pgvector similarity search → context
   c. Calls tools (query roster, lookup nurse, update shift)
   d. Returns structured response
4. Frontend receives response → TTS to user
5. If confirmation needed → user confirms → second tRPC call executes
```

### Where the Agent Runs

The LangChain agent runs **in `apps/server`** (Hono/CF Workers). All dependencies are HTTP-based:

- `@langchain/google-genai` → calls Google Gemini API (HTTPS)
- `@langchain/ollama` → calls local Ollama API (HTTP, fallback only)
- RAG queries → direct SQL via `@neondatabase/serverless` (HTTPS)
- Agent execution loop → pure JS, no Node-specific APIs needed

---

## LLM Provider Strategy

### Tier 1: Google Gemini 2.5 Flash (Primary)

| Property | Value |
|----------|-------|
| Model | `gemini-2.5-flash` |
| Provider | `@langchain/google-genai` → `ChatGoogleGenerativeAI` |
| Free tier | ~250 req/day, 10 RPM, 1M token context |
| Tool calling | Full function calling support |
| Streaming | Supported |
| Cost | **$0** for low-volume use |

Google Gemini Free Tier (as of April 2026):
- Gemini 2.5 Flash: 10 RPM, ~250 requests/day
- Gemini 2.5 Flash-Lite: 15 RPM, ~1,000 requests/day (fallback model)
- Includes function calling, JSON mode, multimodal
- **No credit card required** to sign up at [aistudio.google.com](https://aistudio.google.com)

### Tier 2: Ollama (Local Fallback)

| Property | Value |
|----------|-------|
| Model | `llama3.2` (3B) or `mistral` (7B) |
| Provider | `@langchain/ollama` → `ChatOllama` |
| Latency | ~500-2000ms on Apple Silicon |
| Quality | Good for simple parsing, weaker at complex reasoning |
| Cost | **$0** (runs locally) |
| Privacy | 100% private, no data leaves machine |

### Fallback Chain Logic

```
processText(text):
  1. Try Gemini 2.5 Flash with 10s timeout
  2. On 429/5xx/network error → retry with 1s backoff (max 2 retries)
  3. On persistent failure → try Ollama (if configured)
  4. If Ollama unavailable → return degraded response with explanation
```

### Embeddings

| Use | Model | Provider |
|-----|-------|----------|
| RAG indexing (primary) | `text-embedding-004` (768d) | Google Gemini API (free tier includes embeddings) |
| RAG indexing (fallback) | `nomic-embed-text` (768d) | Ollama (local) |
| Query embedding | Same as indexing | Same as indexing |

---

## RAG (Retrieval-Augmented Generation) Pipeline

### Why RAG?

The agent needs context to answer questions and make decisions:
- Current roster state (who's assigned where)
- Nurse preferences (who likes which shifts)
- Coverage requirements (min/max per shift type)
- Scheduling policies (constraints from `BUSINESS_LOGIC.md`)

Embedding this data in a vector store lets the agent retrieve relevant context at query time, without hardcoding rules.

### Vector Store: pgvector on Neon

Your existing **Neon PostgreSQL** supports `pgvector` natively. No new infrastructure.

```sql
-- One-time setup (already available on Neon)
CREATE EXTENSION IF NOT EXISTS vector;
```

### Schema

New Drizzle table in `packages/db/src/schema/roster-embeddings.ts`:

```ts
import { pgTable, uuid, text, jsonb } from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm"; // or raw SQL

export const rosterEmbeddings = pgTable("roster_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull(),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
});
```

### What Gets Indexed

| Document type | Content template | Metadata | Refresh |
|--------------|------------------|----------|---------|
| **Daily assignment** | `"Nurse {name} is on {shiftType} shift on {date}"` | `{ type: "assignment", nurseId, date, shiftType, month }` | On roster generate |
| **Nurse info** | `"Nurse {name} prefers {shiftType} with weight {weight}"` | `{ type: "nurse", nurseId, name }` | On pref update |
| **Shift type** | `"Morning shift starts at 7:00, ends at 14:00. Coverage: 20 on weekdays, 3 on Fridays"` | `{ type: "shift_type", shiftId }` | Static |
| **Policy** | `"Max 2 consecutive night shifts. Mandatory rest after 2 nights. No nurse works two shifts same day."` | `{ type: "policy" }` | Rarely |
| **Coverage rules** | `"Weekday coverage: 20 morning, 3 evening, 2 night. Friday coverage: 3 morning, 3 evening, 2 night"` | `{ type: "coverage" }` | Static |
| **Historical note** | `"Nurse {name} was on {shiftType} on {date}"` | `{ type: "history", nurseId, date }` | Optional |

### Indexing Pipeline

```
Roster Generated/Updated
       │
       ▼
Fetch all nurse schedules for current month
Fetch all nurse preferences
Fetch static policy documents
       │
       ▼
Split into individual documents (one per nurse per day)
       │
       ▼
Embed each document via Google text-embedding-004
       │
       ▼
Upsert into pgvector table
       │
       ▼
(Optional) Clean up stale embeddings from previous months
```

**Trigger points**:
1. After `generateRoster` mutation completes → re-index current month
2. After `updateShift` mutation → re-index affected nurse/day
3. After preference updates → re-index affected nurse
4. On demand via admin endpoint

### Retriever

```ts
async function retrieveContext(query: string, k = 8): Promise<Document[]> {
  // 1. Embed the query
  const queryEmbedding = await embeddings.embedQuery(query);

  // 2. Vector similarity search via direct SQL
  const result = await db.execute(sql`
    SELECT content, metadata,
           1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM roster_embeddings
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${k}
  `);

  // 3. Return as LangChain documents
  return result.rows.map(row => new Document({
    pageContent: row.content,
    metadata: row.metadata,
  }));
}
```

LangChain's `PGVectorStore` from `@langchain/community` is **not used** because:
- It depends on the `pg` TCP driver which doesn't work on Cloudflare Workers
- Direct SQL via `@neondatabase/serverless` is simpler and already in use
- No ORM abstraction overhead — the vector query is straightforward

---

## LangChain Agent

### Package Structure

```
packages/agent/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                   # Public API
    ├── types.ts                   # Agent response types
    ├── agent.ts                   # LangChain agent setup
    ├── system-prompt.ts           # System prompt for the LLM
    ├── llm-provider.ts            # Gemini → Ollama fallback
    ├── embeddings.ts              # Embedding provider
    └── tools/
    │   ├── index.ts               # Tool exports
    │   ├── query-roster.ts        # Query schedules by date range
    │   ├── get-nurse.ts           # Lookup nurse by name (phonetic)
    │   ├── update-shift.ts        # Update a single shift
    │   ├── swap-shift.ts          # Swap shifts between two nurses
    │   ├── get-coverage.ts        # Check shift coverage for a date
    │   ├── get-preferences.ts     # Get nurse preferences
    │   └── explain-solver.ts      # Explain solver constraints
    └── rag/
        ├── index.ts               # RAG exports
        ├── indexer.ts             # Document creation + embedding + upsert
        └── retriever.ts           # Query embedding + vector search
```

### Agent Type: Tool-Calling Agent

Using `@langchain/langgraph` for agent orchestration:

```ts
// agent.ts (conceptual)
const agent = createReactAgent({
  llm: primaryLLM.withFallbacks([fallbackLLM]),
  tools: [
    queryRosterTool,
    getNurseTool,
    updateShiftTool,
    swapShiftTool,
    getCoverageTool,
    getPreferencesTool,
  ],
  messageModifier: systemPrompt,
});
```

### System Prompt

The system prompt instructs the LLM to:

1. **Identify intent** — update shift, query roster, swap shifts, check coverage, or general
2. **Use RAG** — retrieve context before making decisions
3. **Use tools** — never guess data, always call a tool
4. **Confirm changes** — ask user before destructive writes
5. **Handle ambiguity** — ask clarifying questions
6. **Handle errors** — explain what went wrong

Full system prompt template in `packages/agent/src/system-prompt.ts`.

### Agent Tools

Each tool wraps an existing DB query or service function from `packages/api/src/roster/`.

| Tool | Description | Input | Output | Underlying function |
|------|-------------|-------|--------|-------------------|
| `queryRoster` | Query nurse schedules for a date range | `{ startDate, endDate, nurseName? }` | List of assignments | `findSchedulesAndPreferencesByDateRange()` |
| `getNurse` | Look up a nurse by name with phonetic matching | `{ name }` | Nurse info + ID | `findAllNurses()` + name matching |
| `updateShift` | Set a nurse's shift for a specific date | `{ nurseId, dateKey, shiftType }` | Confirmation | `upsertSchedule()` |
| `swapShift` | Swap shifts between two nurses on a date | `{ nurseId1, nurseId2, dateKey }` | Confirmation | Two `upsertSchedule` calls |
| `getCoverage` | Get shift coverage distribution for a date | `{ dateKey }` | Counts per shift type | Aggregation query |
| `getPreferences` | Get a nurse's shift preferences | `{ nurseId }` | Preference weights | DB preference query |
| `getNurseByDate` | Find which nurse is on a shift on a given date | `{ dateKey, shiftType }` | Nurse name(s) | Schedule query |

### Agent Response Format

```ts
interface AgentResponse {
  intent: "update" | "query" | "swap" | "check" | "unknown";
  success: boolean;

  // For direct answers (queries)
  answer?: string;

  // For actions needing confirmation
  confirmation?: {
    action: "updateShift" | "swapShift";
    params: Record<string, unknown>;
    summary: string; // Human-readable: "Update Joysree to Morning on May 27"
  };

  // For multi-turn
  needsClarification?: string; // Question to ask user

  // Error cases
  error?: string;
}
```

---

## Frontend Changes

### What Stays the Same

- `useVoice.ts` — audio capture, STT, WebSocket relay, silence detection
- `useSpeechSynthesis.ts` — TTS via Web Speech API
- `VoiceTrigger.tsx` / `VoicePopover.tsx` — UI components
- `MessageItem.tsx` — message rendering

### What Changes

**`useVoiceAssistantLogic.ts`** — the core change:

```ts
// OLD: const parsed = parseCommand(text);
// NEW:
const response = await trpc.agent.processCommand.mutate({ text });
```

The frontend state machine simplifies dramatically:

| Aspect | Before | After |
|--------|--------|-------|
| Command parsing | Regex in browser | LLM on server |
| Field accumulation | Manual ref tracking | LLM handles multi-turn |
| Missing field detection | Rule-based | LLM asks naturally |
| Confirmation | Manual state machine | LLM generates confirmation text |
| Intent detection | Only "update" | update/query/swap/check |

The hook reduces from ~225 lines to ~80 lines.

### New tRPC Procedures

```ts
agent: router({
  processCommand: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const response = await runAgent(input.text);
      return response;
    }),

  confirmAction: protectedProcedure
    .input(z.object({
      action: z.enum(["updateShift", "swapShift"]),
      params: z.record(z.unknown()),
    }))
    .mutation(async ({ input }) => {
      return executeConfirmedAction(input.action, input.params);
    }),

  reIndexRoster: adminProcedure
    .input(z.object({ month: z.string() }))
    .mutation(async ({ input }) => {
      await indexRoster(input.month);
      return { success: true };
    }),
}),
```

---

## Implementation Phases

### Phase 1: Foundation (packages/agent)

**Files to create:**

| File | Contents |
|------|----------|
| `packages/agent/package.json` | Dependencies: `@langchain/core`, `@langchain/google-genai`, `@langchain/ollama`, `@langchain/langgraph` |
| `packages/agent/tsconfig.json` | Extends `@Duty-Roster/config` |
| `packages/agent/src/index.ts` | Re-export `processText`, `runAgent`, `indexRoster` |
| `packages/agent/src/types.ts` | `AgentResponse`, tool input/output types |
| `packages/agent/src/llm-provider.ts` | `ChatGoogleGenerativeAI` with fallback to `ChatOllama` |
| `packages/agent/src/embeddings.ts` | Google `text-embedding-004` with Ollama fallback |
| `packages/agent/src/system-prompt.ts` | Full system prompt template |

**Estimated effort**: 2-3 sessions

### Phase 2: RAG Pipeline

**Files to create:**

| File | Contents |
|------|----------|
| `packages/agent/src/rag/indexer.ts` | Fetch roster → create documents → embed → upsert to pgvector |
| `packages/agent/src/rag/retriever.ts` | Embed query → vector similarity search SQL |

**Files to modify:**

| File | Change |
|------|--------|
| `packages/db/src/schema/roster-embeddings.ts` | New Drizzle table with pgvector column |
| `packages/db/src/schema/index.ts` | Export `rosterEmbeddings` |
| `packages/env/src/agent.ts` | Add `GEMINI_API_KEY`, `OLLAMA_BASE_URL`, `LLM_PROVIDER` |

**Estimated effort**: 2 sessions

### Phase 3: Agent + Tools

**Files to create:**

| File | Contents |
|------|----------|
| `packages/agent/src/agent.ts` | LangGraph `createReactAgent` with all tools |
| `packages/agent/src/tools/index.ts` | Tool re-exports |
| `packages/agent/src/tools/query-roster.ts` | `queryRoster` tool definition |
| `packages/agent/src/tools/get-nurse.ts` | `getNurse` tool with phonetic matching |
| `packages/agent/src/tools/update-shift.ts` | `updateShift` tool |
| `packages/agent/src/tools/swap-shift.ts` | `swapShift` tool |
| `packages/agent/src/tools/get-coverage.ts` | `getCoverage` tool |
| `packages/agent/src/tools/get-preferences.ts` | `getPreferences` tool |
| `packages/agent/src/tools/get-nurse-by-date.ts` | `getNurseByDate` tool |

**Estimated effort**: 2 sessions

### Phase 4: Server Integration

**Files to modify:**

| File | Change |
|------|--------|
| `packages/api/src/roster/router.ts` | Add `agent` tRPC router with `processCommand`, `confirmAction`, `reIndexRoster` |
| `packages/api/src/index.ts` | Export agent router |
| `apps/server/src/index.ts` | No changes needed (existing tRPC handler picks up new router) |

**Estimated effort**: 1 session

### Phase 5: Frontend Integration

**Files to modify:**

| File | Change |
|------|--------|
| `apps/web/src/features/voice-assistant/hooks/useVoiceAssistantLogic.ts` | Replace `parseCommand()` with `trpc.agent.processCommand()` |
| `apps/web/src/features/voice-assistant/hooks/useConfirmShiftUpdate.ts` | Simplify — LLM handles ID resolution |
| `apps/web/src/features/voice-assistant/utils/commandParser.ts` | Keep as fallback for degraded mode or delete |

**Estimated effort**: 1 session

### Phase 6: Verification & Polish

**Tasks:**

- [ ] Verify agent correctly parses 20+ test sentences
- [ ] Verify RAG retrieves relevant context
- [ ] Verify Gemini free tier rate limits are handled
- [ ] Verify Ollama fallback works (test by disabling API key)
- [ ] Verify no echo/feedback loops (agent speaks → STT hears)
- [ ] Verify end-to-end: speak command → agent processes → shift updates
- [ ] Verify degraded mode falls back to regex parser if both LLMs fail
- [ ] Benchmark: latency from STT result to agent response

**Estimated effort**: 1 session

---

## Dependencies

### New packages (packages/agent/package.json)

```json
{
  "name": "@Duty-Roster/agent",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "default": "./src/index.ts" },
    "./*": { "default": "./src/*.ts" }
  },
  "dependencies": {
    "@Duty-Roster/api": "workspace:*",
    "@Duty-Roster/db": "workspace:*",
    "@langchain/core": "^0.3",
    "@langchain/google-genai": "^0.2",
    "@langchain/langgraph": "^0.2",
    "@langchain/ollama": "^0.2"
  },
  "devDependencies": {
    "@Duty-Roster/config": "workspace:*",
    "typescript": "^5"
  }
}
```

### New env vars

```
GEMINI_API_KEY=                          # Required for primary LLM
OLLAMA_BASE_URL=http://localhost:11434   # Optional, for fallback
LLM_PROVIDER=gemini                      # gemini | ollama
LLM_FALLBACK_ENABLED=true                # Enable Ollama fallback
```

### No new infrastructure

| Component | Where | Status |
|-----------|-------|--------|
| Vector store | Existing Neon PostgreSQL (pgvector) | Already available |
| Primary LLM | Google Gemini API (HTTPS) | Free tier, no infra |
| Fallback LLM | Ollama on localhost | Optional, user installs |
| Agent runtime | apps/server (CF Workers) | Already deployed |
| Frontend | apps/web (Next.js) | Already deployed |

---

## Edge Cases & Failure Modes

### Rate Limiting (Gemini Free Tier)

| Scenario | Handling |
|----------|----------|
| 429 Too Many Requests | Retry with exponential backoff (1s, 2s), then fallback to Ollama |
| 500 Internal Error | Same as 429 — retry then fallback |
| Daily quota exceeded | Fallback to Ollama for rest of day |
| Both LLMs unavailable | Return `{ success: false, error: "..." }`, frontend falls back to regex parser |

### Embedding Failures

| Scenario | Handling |
|----------|----------|
| Embedding API 429 | Same retry logic as LLM |
| Query embedding fails | Skip RAG, agent operates on tool results only (no context) |
| Indexing embedding fails | Log error, retry on next index trigger |

### Agent Errors

| Scenario | Handling |
|----------|----------|
| Tool call fails (DB down) | Agent returns error message: "I couldn't update the shift because the database is not responding." |
| Tool returns empty results | Agent says: "I couldn't find any data for that query. Could you try different dates or names?" |
| Ambiguous nurse name | Agent asks: "There are two nurses named 'Sarah' — do you mean Sarah Johnson (Evening, ID 3) or Sarah Williams (Morning, ID 7)?" |
| Invalid shift type | Agent says: "The available shift types are morning, evening, night, and off." |
| Date parsing failed | Agent says: "I couldn't understand the date. Can you specify it as a specific date like 'May 27'?" |

### Voice-Specific

| Scenario | Handling |
|----------|----------|
| Agent speaks while STT hears | Echo protection already implemented (isSpeakingRef + 1.5s cooldown) |
| User interrupts agent | STT still works, but echo guard discards partials during speech |
| Long agent response | Break into short TTS chunks (3-4 sentences max) |

---

## Comparison: Before vs After

### Voice Command Parsing

| Aspect | Before (regex) | After (LLM agent) |
|--------|---------------|-------------------|
| "Joysree morning May 27" | ✅ Parsed | ✅ Parsed |
| "Set Joysree to evening on the 27th" | ❌ "set" not in SHIFT_WORDS | ✅ Understood |
| "Can you put Joysree on night shift this Friday?" | ❌ "put" not in SHIFT_WORDS | ✅ Understood |
| "Who's working the night shift on Friday?" | ❌ No query support | ✅ Answers from roster query |
| "Swap my shift with Joysree on Friday" | ❌ No swap support | ✅ Swaps shifts |
| "I need someone to cover my morning shift on May 27" | ❌ Too complex | ✅ Understands request, queries roster, suggests coverage |
| "How many nurses are on evening shift tomorrow?" | ❌ No query support | ✅ Returns count |
| "What does Joysree prefer?" | ❌ No preference query | ✅ Returns preferences from tool |
| "Change her to morning instead" | ❌ Can't resolve "her" | ✅ With conversation memory, resolves reference |

### Frontend State Machine

| Before (~225 lines) | After (~80 lines) |
|--------------------|-------------------|
| Manual `accumulatedDataRef` tracking | LLM manages conversation state |
| Manual `missingFields` detection | LLM asks for what it needs |
| Hardcoded `askForMissingFields()` | LLM generates natural clarifying questions |
| Hardcoded `askForConfirmation()` | LLM generates confirmation text |
| Manual `confirmShiftUpdate()` call | Agent executes confirmed action via tool |

---

## What Is NOT Changed

- `apps/voice-server/src/index.ts` — WS relay untouched
- `stt/server.py` — Vosk STT untouched
- `packages/db/src/schema/*` — Only new table added, no existing tables modified
- `apps/web/src/features/voice-assistant/hooks/useVoice.ts` — Audio capture untouched
- `apps/web/src/features/voice-assistant/hooks/useSpeechSynthesis.ts` — TTS untouched
- `apps/web/src/features/voice-assistant/components/*` — UI components largely untouched
- `packages/api/src/roster/solver.py` — OR-Tools solver untouched
- `packages/api/src/roster/service.ts` — Existing business logic untouched (agent calls it via tools)

---

## Success Metrics

| Metric | Target | How to measure |
|--------|--------|---------------|
| Command parsing accuracy | >95% of test sentences parsed correctly | Manual test suite of 50 utterances |
| Agent response latency | <3s from STT result to agent response | Timestamp logs |
| RAG relevance | Top-3 retrieved docs contain relevant info for >90% of queries | Manual evaluation |
| Gemini fallback coverage | 0% user-facing errors when Gemini rate-limited | Simulated 429 in dev |
| Frontend code reduction | `useVoiceAssistantLogic.ts` reduces from ~225 to ~80 lines | Line count |
| New capabilities | query, swap, check coverage, preference lookup | Functional tests |
