---
name: duty-roster-agent
description: LangChain agent tool development for the Duty Roster project. Use when adding or modifying agent tools, updating the LangGraph state graph, changing system prompts, or modifying the ai-parser. Filenames: packages/agent/src/, packages/ai-parser/src/.
---

# duty-roster-agent

The agent is a LangChain LangGraph-based conversational assistant for roster queries and modifications. Location: `packages/agent/`.

## Architecture

```
graph.ts     — StateGraph definition, routing, node functions
llm.ts       — LLM factory (Groq or OpenRouter)
index.ts     — Public API (buildAgent)
tools/       — Agent tool definitions
  query-schedule.ts
  query-shift.ts
  list-nurses.ts
  set-shift.ts
orchestrator/ — (future) multi-agent orchestration
rag/          — (future) RAG pipeline
```

## Graph structure (graph.ts)

```
START → agent (callModel) → tools (ToolNode) → agent → ... → format_response → END
```

- **agent node**: Calls LLM with `bindTools(tools)`, returns message
- **tools node**: Executes any tool calls the LLM requested
- **format_response node**: Handles "how many" / counting queries, returns final answer
- **Conditional edge**: After agent, route to `tools`, `format_response`, or `END` based on message content

```typescript
const agent = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addNode("format_response", formatResponse)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", routeAfterAgent, { ... })
  .addEdge("tools", "agent")
  .addEdge("format_response", END)
  .compile();
```

## Adding a new tool

1. Create file in `packages/agent/src/tools/<name>.ts`
2. Define a `DynamicStructuredTool` (from `@langchain/core/tools`)
3. Add Zod schema for input
4. Implement the call function (use `@Duty-Roster/api` for DB queries)
5. Import and add to `tools` array in `graph.ts`
6. Update `SYSTEM_PROMPT` in `graph.ts` to describe the new tool

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const myTool = new DynamicStructuredTool({
  name: "myTool",
  description: "What this tool does",
  schema: z.object({ /* input */ }),
  func: async ({ /* input */ }) => {
    // implementation
    return JSON.stringify(result);
  },
});
```

## LLM configuration (llm.ts)

Priority order:
1. `OPENO_ROUTER_API_KEY` → ChatOpenAI (OpenRouter, model: `meta-llama/llama-3.1-8b-instruct`)
2. `GROQ_API_KEY` → ChatGroq (model: `meta-llama/llama-4-scout-17b-16e-instruct`)

Temperature is always 0 for deterministic tool calling.

## Existing tools

| Tool | Purpose |
|---|---|
| `querySchedule(nurseName, dateKey)` | Get nurse's schedule for a date |
| `queryShift(shiftName, dateKey)` | Get who's assigned to a shift on a date |
| `listNurses()` | List all nurses |
| `setShift(nurseName, shiftName, dateKey)` | Assign a shift to a nurse |

Tool implementations use the `ai-parser` package (`packages/ai-parser/`) for:
- **Phonetic name matching** — matches Bengali/English nurse names with phonetic similarity
- **Date parsing** — parses relative dates ("next Friday", "2nd March")
- **Shift parsing** — parses shift names ("morning", "evening", "night")

## System prompt guidelines

The `SYSTEM_PROMPT` in `graph.ts` should:
- State current date (injected via `new Date().toISOString()`)
- Be extremely concise — 1 sentence per instruction
- List available tools with their parameters
- Specify response format ("Be concise, 1 sentence")

## Server integration

The agent is invoked via the `POST /api/agent` endpoint in `apps/server/src/index.ts`, which receives `{ text, history }` and returns the agent's response.
