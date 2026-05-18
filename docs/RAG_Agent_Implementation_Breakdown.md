# RAG Agent Implementation Plan & Architecture

## Overview

This document describes the complete implementation path for a RAG-enabled roster agent using LangChain and pgvector. It combines strategic planning, detailed architecture, and practical implementation guidance.

**Status**: Future feature, not yet in repository  
**Tech Stack**: LangChain, pgvector, PostgreSQL, TypeScript, Cloudflare Workers

---

## Part 1: High-Level Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Backend Endpoint)                │
│                  /api/agent/query, /api/agent/confirm            │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌─────────────────────────────▼────────────────────────────────────┐
│              Agent Orchestration Layer (LangChain)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ Conversation │  │   Agent      │  │  Step        │            │
│  │ Manager      │  │  Executor    │  │  Tracer      │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼──────┐  ┌─────────▼──────────┐
│ Retrieval      │  │ Tool           │  │ LLM Provider      │
│ Pipeline       │  │ Registry       │  │ Manager           │
│ (pgvector)     │  │                │  │                   │
│                │  │ ┌────────────┐ │  │ ┌──────────────┐  │
│ ┌────────────┐ │  │ │updateShift │ │  │ │Primary       │  │
│ │pgvector    │ │  │ ├────────────┤ │  │ │(Claude/GPT)  │  │
│ │with HNSW   │ │  │ │getCoverage │ │  │ ├──────────────┤  │
│ │            │ │  │ ├────────────┤ │  │ │Fallback      │  │
│ │ ┌────────┐ │ │  │ │queryRoster │ │  │ │(Ollama)      │  │
│ │ │Embedder│ │ │  │ ├────────────┤ │  │ └──────────────┘  │
│ │ └────────┘ │ │  │ │getNurseInfo│ │  │ ┌──────────────┐  │
│ │ ┌────────┐ │ │  │ └────────────┘ │  │ │Retry &       │  │
│ │ │Indexer │ │ │  │                │  │ │Fallback      │  │
│ │ └────────┘ │ │  │ ┌────────────┐ │  │ │Logic         │  │
│ └────────────┘ │  │ │Validator   │ │  │ └──────────────┘  │
│ ┌────────────┐ │  │ │(auth,      │ │  │                   │
│ │Prompt      │ │  │ │safety)     │ │  │                   │
│ │Templates   │ │  │ └────────────┘ │  │                   │
│ └────────────┘ │  └────────────────┘  └───────────────────┘
└────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼──────────┐  ┌──────▼──────┐  ┌─────────▼─────────┐
│State Store       │  │Event Bus    │  │Config & Secrets   │
│                  │  │             │  │                   │
│ ┌──────────────┐ │  │ ┌─────────┐ │  │ ┌──────────────┐  │
│ │Conversation  │ │  │ │Tool      │ │  │ │Provider      │  │
│ │History       │ │  │ │Executed  │ │  │ │Credentials   │  │
│ │(in-memory/   │ │  │ │          │ │  │ │              │  │
│ │ cache)       │ │  │ │Tool      │ │  │ │pgvector      │  │
│ ├──────────────┤ │  │ │Reverted  │ │  │ │Config        │  │
│ │Pending       │ │  │ │          │ │  │ │              │  │
│ │Confirmations │ │  │ │Agent     │ │  │ │Feature Flags │  │
│ │              │ │  │ │Error     │ │  │ │              │  │
│ │(mutation     │ │  │ │          │ │  │ └──────────────┘  │
│ │ staging)     │ │  │ └─────────┘ │  │                   │
│ └──────────────┘ │  │             │  │                   │
└───────┬──────────┘  └─────────────┘  └───────────────────┘
        │
        └──────────────────────┬──────────────────────┐
                               │                      │
                    ┌──────────▼─────────┐  ┌─────────▼──────────┐
                    │PostgreSQL + pgvector│  │Logging & Tracing  │
                    │(Roster & embeddings) │  │(LangSmith/etc)    │
                    └────────────────────┘  └───────────────────┘
```

### Design Principles

1. **Layered Architecture**: Clear separation between API, orchestration, tools, retrieval, and providers
2. **Dependency Inversion**: High-level modules don't depend on low-level implementations
3. **pgvector as Primary**: Keep roster data and embeddings in sync via ACID transactions
4. **Testability First**: All components independently mockable via dependency injection
5. **Fail-Safe Execution**: Graceful degradation, confirmation gates for mutations
6. **Observable by Default**: All decisions and tool calls traced and logged

---

## Part 2: Implementation Phases

### Phase 1: Package Scaffolding

#### Goals

- Create foundational package structure
- Set up TypeScript, testing, and build tooling
- Establish interfaces for key components

#### Deliverables

```
packages/agent/
├── src/
│   ├── api/              # HTTP endpoint handlers
│   ├── orchestration/    # LangChain agent executor
│   ├── retrieval/        # pgvector integration
│   ├── tools/            # Tool definitions & validators
│   ├── providers/        # LLM provider abstraction
│   ├── state/            # Session & confirmation state
│   ├── events/           # Event bus & tracing
│   ├── config.ts         # Configuration loader
│   └── index.ts          # Main exports
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── tsconfig.json
├── package.json
└── README.md
```

#### Implementation Steps

1. **Create package manifest**

```json
{
  "name": "@roster/agent",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./api": "./dist/api/index.js",
    "./orchestration": "./dist/orchestration/index.js",
    "./retrieval": "./dist/retrieval/index.js"
  },
  "dependencies": {
    "langchain": "^0.1.0",
    "@langchain/core": "^0.1.0",
    "@langchain/community": "^0.1.0",
    "pg": "^8.11.0",
    "pgvector": "^0.1.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "vitest": "^0.34.0",
    "@types/pg": "^8.10.0"
  }
}
```

2. **Core interfaces** (`src/types.ts`)

```typescript
// LLM
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  tokenCount(text: string): number;
}

// Tools
export interface Tool {
  name: string;
  description: string;
  schema: JSONSchema;
  validate(input: unknown): ValidationResult;
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
  shouldConfirm(input: unknown): boolean;
}

// Retrieval
export interface RetrievalResult {
  content: string;
  source: string;
  relevance: number;
  metadata: Record<string, any>;
}

export interface Retriever {
  retrieve(
    query: string,
    filters?: RetrievalFilters,
  ): Promise<RetrievalResult[]>;
}

// Agent
export interface AgentStep {
  type:
    | "thinking"
    | "tool_call"
    | "confirmation_required"
    | "complete"
    | "error";
  reasoning?: string;
  tool?: ToolInvocation;
  result?: ToolResult;
  finalResponse?: string;
  error?: AgentError;
}

export interface AgentOrchestrator {
  processQuery(
    query: string,
    sessionContext: SessionContext,
  ): AsyncGenerator<AgentStep>;
}
```

3. **Configuration system** (`src/config.ts`)

```typescript
import { z } from "zod";

const ConfigSchema = z.object({
  // LLM
  llmPrimary: z.object({
    provider: z.enum(["openai", "anthropic", "ollama"]),
    model: z.string(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
  }),
  llmFallback: z
    .object({
      provider: z.enum(["ollama"]),
      model: z.string(),
      baseUrl: z.string(),
    })
    .optional(),

  // pgvector
  database: z.object({
    url: z.string(),
    maxConnections: z.number().default(10),
  }),
  pgvector: z.object({
    dimension: z.number().default(1536),
    indexMethod: z.enum(["hnsw", "ivfflat"]).default("hnsw"),
  }),

  // Embeddings
  embedding: z.object({
    provider: z.enum(["openai", "ollama", "huggingface"]),
    model: z.string(),
    apiKey: z.string().optional(),
  }),

  // Agent behavior
  agent: z.object({
    maxIterations: z.number().default(10),
    contextWindowTokens: z.number().default(4000),
    sessionTtlMinutes: z.number().default(30),
    confirmationTimeoutMinutes: z.number().default(5),
  }),

  // Observability
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
    langsmithTracing: z.boolean().default(false),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: Record<string, string>): Config {
  return ConfigSchema.parse({
    llmPrimary: {
      provider: env.AGENT_LLM_PRIMARY || "anthropic",
      model: env.AGENT_LLM_PRIMARY_MODEL || "claude-3-sonnet",
      apiKey: env.AGENT_LLM_PRIMARY_KEY,
      baseUrl: env.AGENT_LLM_PRIMARY_URL,
    },
    llmFallback: env.AGENT_LLM_FALLBACK_URL
      ? {
          provider: "ollama",
          model: env.AGENT_LLM_FALLBACK_MODEL || "mistral",
          baseUrl: env.AGENT_LLM_FALLBACK_URL,
        }
      : undefined,
    database: {
      url: env.DATABASE_URL,
      maxConnections: parseInt(env.AGENT_DB_MAX_CONNECTIONS || "10"),
    },
    pgvector: {
      dimension: parseInt(env.PGVECTOR_DIMENSION || "1536"),
    },
    embedding: {
      provider: env.EMBEDDING_PROVIDER || "openai",
      model: env.EMBEDDING_MODEL || "text-embedding-3-small",
      apiKey: env.OPENAI_API_KEY,
    },
    agent: {
      maxIterations: parseInt(env.AGENT_MAX_ITERATIONS || "10"),
      contextWindowTokens: parseInt(env.AGENT_CONTEXT_WINDOW || "4000"),
      sessionTtlMinutes: parseInt(env.AGENT_SESSION_TTL || "30"),
    },
    logging: {
      level: (env.LOG_LEVEL || "info") as any,
      langsmithTracing: env.LANGSMITH_TRACING === "true",
    },
  });
}
```

#### Testing

- Unit test config loader with various env combinations
- Verify all required vars present or have defaults
- Test fallback chain initialization

---

### Phase 2: LLM Provider and Fallback Setup

#### Goals

- Implement provider abstraction with fallback logic
- Support cloud (Claude/OpenAI) + local (Ollama) models
- Enable cost tracking and token budgeting

#### Implementation

**Provider Manager** (`src/providers/manager.ts`)

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { Ollama } from "@langchain/community/llms/ollama";

export interface ProviderConfig {
  name: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  fallback?: ProviderConfig;
  timeout: number;
  retryPolicy: RetryPolicy;
}

export class ProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private currentProvider: string;
  private configs: ProviderConfig[];

  constructor(configs: ProviderConfig[]) {
    this.configs = configs;
    this.currentProvider = configs[0].name;
    this.initializeProviders(configs);
  }

  private initializeProviders(configs: ProviderConfig[]) {
    for (const config of configs) {
      const provider = this.createProvider(config);
      this.providers.set(config.name, provider);
    }
  }

  private createProvider(config: ProviderConfig): BaseChatModel {
    if (config.name.includes("anthropic")) {
      return new ChatAnthropic({
        apiKey: config.apiKey,
        model: config.model,
        temperature: 0.7,
        maxTokens: 2048,
        timeout: config.timeout,
      });
    } else if (config.name.includes("openai")) {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        model: config.model,
        temperature: 0.7,
        maxTokens: 2048,
        timeout: config.timeout,
      });
    } else if (config.name.includes("ollama")) {
      return new Ollama({
        baseUrl: config.baseUrl,
        model: config.model,
        temperature: 0.7,
        timeout: config.timeout,
      });
    }
    throw new Error(`Unknown provider: ${config.name}`);
  }

  async getProvider(): Promise<BaseChatModel> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Provider ${this.currentProvider} not found`);
    }

    // Test provider health with a lightweight call
    try {
      await this.testProvider(provider);
      return provider;
    } catch (err) {
      console.error(`Provider ${this.currentProvider} failed:`, err);
      return this.switchToFallback();
    }
  }

  private async testProvider(provider: BaseChatModel): Promise<void> {
    const response = await provider.invoke([
      { role: "user", content: 'respond with "ok"' },
    ]);
    if (!response.content) {
      throw new Error("Empty response from provider");
    }
  }

  private async switchToFallback(): Promise<BaseChatModel> {
    const currentConfig = this.configs.find(
      (c) => c.name === this.currentProvider,
    );
    if (!currentConfig?.fallback) {
      throw new Error("No fallback provider configured");
    }

    this.currentProvider = currentConfig.fallback.name;
    console.log(`Switched to fallback provider: ${this.currentProvider}`);

    const fallback = this.providers.get(this.currentProvider);
    if (!fallback) {
      throw new Error(`Fallback provider not initialized`);
    }

    return fallback;
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    const provider = await this.getProvider();

    const langchainMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await provider.invoke(langchainMessages);

      eventBus.emit({
        type: "llm_called",
        provider: this.currentProvider,
        tokensUsed: options?.maxTokens || 0,
        success: true,
      });

      return {
        content: response.content,
        stopReason: "end_turn",
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("rate_limit")) {
        // Exponential backoff for rate limits
        await this.backoffAndRetry(messages, options);
      }
      throw err;
    }
  }

  private async backoffAndRetry(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    for (let i = 0; i < 3; i++) {
      const delay = Math.pow(2, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        return await this.chat(messages, options);
      } catch (err) {
        if (i === 2) throw err;
      }
    }
    throw new Error("Retry failed");
  }

  getProviderStatus(): ProviderInfo[] {
    return this.configs.map((config) => ({
      name: config.name,
      model: config.model,
      status: this.currentProvider === config.name ? "active" : "standby",
      available: this.providers.has(config.name),
    }));
  }
}
```

**Token Budget Manager** (`src/providers/token-budget.ts`)

```typescript
export interface TokenBudget {
  total: number;
  used: number;
  remaining: number;
  percent: number;
}

export class TokenBudgetManager {
  private sessionBudgets: Map<string, number> = new Map();
  private costTracker: Map<string, number> = new Map();

  constructor(
    private budgetPerSession: number = 4000,
    private provider: ProviderManager,
  ) {}

  allocateBudget(sessionId: string, tokens: number): boolean {
    const current = this.sessionBudgets.get(sessionId) || 0;
    if (current + tokens > this.budgetPerSession) {
      return false;
    }
    this.sessionBudgets.set(sessionId, current + tokens);
    return true;
  }

  getRemainingBudget(sessionId: string): TokenBudget {
    const used = this.sessionBudgets.get(sessionId) || 0;
    return {
      total: this.budgetPerSession,
      used,
      remaining: this.budgetPerSession - used,
      percent: (used / this.budgetPerSession) * 100,
    };
  }

  trackCost(sessionId: string, tokens: number, provider: string) {
    const cost = this.estimateCost(tokens, provider);
    const current = this.costTracker.get(sessionId) || 0;
    this.costTracker.set(sessionId, current + cost);

    eventBus.emit({
      type: "cost_tracked",
      sessionId,
      tokens,
      cost,
      provider,
    });
  }

  private estimateCost(tokens: number, provider: string): number {
    // Rough estimates; adjust per actual pricing
    const rates = {
      "claude-3-sonnet": 0.003 / 1000, // $0.003 per 1k tokens
      "gpt-4": 0.03 / 1000,
      ollama: 0, // Local
    };
    return tokens * (rates[provider] || 0.001);
  }

  clearSession(sessionId: string) {
    this.sessionBudgets.delete(sessionId);
    this.costTracker.delete(sessionId);
  }
}
```

#### Testing

- Unit tests: Provider initialization with various configs
- Unit tests: Fallback switching on provider failure
- Integration tests: Real (or mocked) LLM calls
- Test retry logic with simulated rate limits

---

### Phase 3: pgvector RAG Pipeline

#### Goals

- Set up PostgreSQL with pgvector extension
- Implement vector store for roster context
- Create document indexer that stays in sync with roster mutations
- Enable hybrid search (vector + SQL filters)

#### Database Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Main documents table
CREATE TABLE roster_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  content TEXT NOT NULL,
  doc_type VARCHAR NOT NULL,

  -- Vector embedding
  embedding vector(1536),  -- OpenAI embeddings dimension

  -- Metadata for filtering & context
  metadata JSONB DEFAULT '{}',

  -- Lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  indexed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,

  CONSTRAINT valid_doc_type CHECK (doc_type IN (
    'assignment', 'nurse_profile', 'rule', 'policy', 'schedule'
  ))
);

-- HNSW index for fast cosine similarity search
CREATE INDEX idx_roster_documents_embedding
ON roster_documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for metadata filtering
CREATE INDEX idx_roster_documents_metadata ON roster_documents USING GIN (metadata);

-- Index for doc_type + freshness (common query pattern)
CREATE INDEX idx_roster_documents_type_freshness
ON roster_documents (doc_type, indexed_at DESC);

-- Track retrieval sessions for feedback/analytics
CREATE TABLE retrieval_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  query_embedding vector(1536),
  retrieved_doc_ids UUID[] NOT NULL,
  user_feedback VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_retrieval_sessions_session
ON retrieval_sessions (session_id, created_at DESC);
```

#### pgvector Store Implementation

```typescript
// src/retrieval/pgvector-store.ts

export class PgvectorStore implements VectorStore {
  constructor(
    private db: Database,
    private embedding: EmbeddingProvider,
    private dimension: number = 1536,
  ) {}

  async index(doc: Document): Promise<void> {
    const vector = await this.embedding.embed(doc.content);

    await this.db.transaction(async (tx) => {
      // ACID: Insert/update document and embedding atomically
      await tx.query(
        `
        INSERT INTO roster_documents (id, content, doc_type, metadata, embedding)
        VALUES ($1, $2, $3, $4, $5::vector)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
      `,
        [
          doc.id,
          doc.content,
          doc.metadata.type,
          JSON.stringify(doc.metadata),
          vector,
        ],
      );

      // Update indexed timestamp
      await tx.query(
        `
        UPDATE roster_documents
        SET indexed_at = NOW()
        WHERE id = $1
      `,
        [doc.id],
      );
    });

    eventBus.emit({
      type: "document_indexed",
      docId: doc.id,
      docType: doc.metadata.type,
    });
  }

  async query(
    embedding: number[],
    k: number = 5,
    filter?: RetrievalFilters,
  ): Promise<Document[]> {
    let query = `
      SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM roster_documents
      WHERE indexed_at > NOW() - INTERVAL '30 days'
    `;

    const params: any[] = [embedding];
    let paramIndex = 2;

    // Add SQL filters for hybrid search
    if (filter?.docType) {
      query += ` AND doc_type = $${paramIndex}`;
      params.push(filter.docType);
      paramIndex++;
    }

    if (filter?.unit) {
      query += ` AND metadata->>'unit' = $${paramIndex}`;
      params.push(filter.unit);
      paramIndex++;
    }

    if (filter?.minDate) {
      query += ` AND metadata->>'date' >= $${paramIndex}`;
      params.push(filter.minDate);
      paramIndex++;
    }

    if (filter?.tags && filter.tags.length > 0) {
      query += ` AND metadata->'tags' ?| $${paramIndex}`;
      params.push(filter.tags);
      paramIndex++;
    }

    query += `
      ORDER BY embedding <=> $1::vector
      LIMIT $${paramIndex}
    `;
    params.push(k);

    const results = await this.db.query(query, params);

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata,
      relevance: r.similarity,
    }));
  }

  async delete(docId: string): Promise<void> {
    await this.db.query("DELETE FROM roster_documents WHERE id = $1", [docId]);
  }

  async getStats(): Promise<any> {
    return this.db.query(`
      SELECT
        COUNT(*) as total_documents,
        COUNT(CASE WHEN indexed_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent,
        pg_size_pretty(pg_total_relation_size('roster_documents')) as size
      FROM roster_documents
    `);
  }
}
```

#### Document Indexer

```typescript
// src/retrieval/document-indexer.ts

export class DocumentIndexer {
  constructor(
    private db: Database,
    private vectorStore: VectorStore,
    private embedding: EmbeddingProvider,
    private eventBus: EventBus,
    private options: IndexerOptions = {},
  ) {
    this.startPeriodicRefresh();
    this.startCleanupJobs();
  }

  async onRosterUpdated(updates: RosterUpdate[]): Promise<void> {
    const documents: Document[] = [];

    for (const update of updates) {
      if (update.type === "shift_assigned") {
        documents.push({
          id: `shift-${update.shiftId}`,
          content: this.formatShift(update),
          metadata: {
            type: "assignment",
            shiftId: update.shiftId,
            nurseId: update.nurseId,
            date: update.date,
            unit: update.unit,
            specialty: update.specialty,
          },
        });
      } else if (update.type === "nurse_profile_updated") {
        documents.push({
          id: `nurse-${update.nurseId}`,
          content: this.formatNurse(update),
          metadata: {
            type: "nurse_profile",
            nurseId: update.nurseId,
            specialty: update.specialty,
            certifications: update.certs,
            seniority: update.seniority,
          },
        });
      } else if (update.type === "rule_changed") {
        documents.push({
          id: `rule-${update.ruleId}`,
          content: this.formatRule(update),
          metadata: {
            type: "rule",
            ruleId: update.ruleId,
            priority: update.priority,
            unit: update.unit,
          },
        });
      }
    }

    // Batch index with error handling
    for (const doc of documents) {
      try {
        await this.vectorStore.index(doc);
      } catch (err) {
        this.eventBus.emit({
          type: "indexing_error",
          docId: doc.id,
          error: String(err),
        });
      }
    }
  }

  private startPeriodicRefresh() {
    setInterval(
      async () => {
        await this.refreshStaleDocuments();
      },
      this.options.refreshIntervalMs || 24 * 60 * 60 * 1000,
    );
  }

  private async refreshStaleDocuments() {
    const staleThreshold = this.options.staleThresholdDays || 7;
    const staleIds = await this.db.query(`
      SELECT id, content, metadata FROM roster_documents
      WHERE indexed_at < NOW() - INTERVAL '${staleThreshold} days'
      LIMIT 100
    `);

    for (const row of staleIds) {
      try {
        await this.vectorStore.index(row);
      } catch (err) {
        console.error(`Failed to refresh ${row.id}:`, err);
      }
    }

    this.eventBus.emit({
      type: "documents_refreshed",
      count: staleIds.length,
    });
  }

  private startCleanupJobs() {
    setInterval(
      async () => {
        await this.cleanupExpired();
      },
      this.options.cleanupIntervalMs || 24 * 60 * 60 * 1000,
    );
  }

  private async cleanupExpired() {
    const result = await this.db.query(`
      DELETE FROM roster_documents WHERE expires_at < NOW()
    `);

    this.eventBus.emit({
      type: "documents_cleaned",
      count: result.rowCount,
    });
  }

  private formatShift(update: any): string {
    return `
      Shift Assignment:
      - Nurse: ${update.nurseId}
      - Date: ${update.date}
      - Unit: ${update.unit}
      - Specialty Required: ${update.specialty}
      - Status: ${update.status}
    `.trim();
  }

  private formatNurse(update: any): string {
    return `
      Nurse Profile:
      - Name: ${update.name}
      - Specialty: ${update.specialty}
      - Certifications: ${update.certs.join(", ")}
      - Experience: ${update.yearsExp} years
      - Availability: ${update.availability}
    `.trim();
  }

  private formatRule(update: any): string {
    return `
      Coverage Rule:
      - Rule: ${update.name}
      - Unit: ${update.unit}
      - Requirement: ${update.requirement}
      - Priority: ${update.priority}
    `.trim();
  }
}
```

#### Retrieval Pipeline

```typescript
// src/retrieval/pipeline.ts

export interface HybridRetrievalOptions {
  vectorK?: number;
  hybridWeight?: number; // 0 = pure keyword, 1 = pure vector
  filters?: RetrievalFilters;
}

export class RetrievalPipeline implements Retriever {
  constructor(
    private vectorStore: VectorStore,
    private embedding: EmbeddingProvider,
    private db: Database,
    private eventBus: EventBus,
  ) {}

  async retrieve(
    query: string,
    options?: HybridRetrievalOptions,
  ): Promise<RetrievalResult[]> {
    const startTime = Date.now();

    // 1. Embed query
    const queryEmbedding = await this.embedding.embed(query);

    // 2. Vector search + optional SQL filters
    const vectorResults = await this.vectorStore.query(
      queryEmbedding,
      options?.vectorK || 10,
      options?.filters,
    );

    // 3. Optional: Keyword fallback if no vector results
    let results = vectorResults;
    if (results.length < 3) {
      const keywordResults = await this.keywordSearch(query, options?.filters);
      results = this.mergeResults(vectorResults, keywordResults);
    }

    // 4. Score and rank
    const scored = results.map((r) => ({
      ...r,
      score: this.scoreRelevance(r, options?.hybridWeight || 0.7),
    }));

    const sorted = scored.sort((a, b) => b.score - a.score).slice(0, 5);

    // 5. Log retrieval session
    await this.db.query(
      `
      INSERT INTO retrieval_sessions (session_id, query_embedding, retrieved_doc_ids)
      VALUES ($1, $2, $3)
    `,
      [generateSessionId(), queryEmbedding, sorted.map((r) => r.metadata?.id)],
    );

    // 6. Emit event
    this.eventBus.emit({
      type: "retrieval_completed",
      duration: Date.now() - startTime,
      resultCount: sorted.length,
      avgRelevance:
        sorted.reduce((sum, r) => sum + r.relevance, 0) / sorted.length,
    });

    return sorted;
  }

  private async keywordSearch(
    query: string,
    filters?: RetrievalFilters,
  ): Promise<RetrievalResult[]> {
    // Fallback to full-text search if vector search fails
    let sql = `
      SELECT id, content, metadata, 
             ts_rank(to_tsvector(content), plainto_tsquery($1)) as rank
      FROM roster_documents
      WHERE to_tsvector(content) @@ plainto_tsquery($1)
    `;
    const params = [query];

    if (filters?.docType) {
      sql += ` AND doc_type = $2`;
      params.push(filters.docType);
    }

    sql += ` ORDER BY rank DESC LIMIT 5`;

    const results = await this.db.query(sql, params);
    return results.map((r) => ({
      content: r.content,
      source: "keyword_search",
      relevance: r.rank,
      metadata: r.metadata,
    }));
  }

  private mergeResults(
    vectorResults: RetrievalResult[],
    keywordResults: RetrievalResult[],
  ): RetrievalResult[] {
    const merged = new Map<string, RetrievalResult>();

    vectorResults.forEach((r) => {
      merged.set(r.metadata?.id, { ...r, source: "vector" });
    });

    keywordResults.forEach((r) => {
      const id = r.metadata?.id;
      if (merged.has(id)) {
        // Boost relevance if both vector and keyword matched
        const existing = merged.get(id)!;
        existing.relevance = Math.min(1, existing.relevance * 1.2);
      } else {
        merged.set(id, { ...r, source: "keyword" });
      }
    });

    return Array.from(merged.values());
  }

  private scoreRelevance(result: RetrievalResult, weight: number): number {
    // Vector score * weight + (doc freshness/metadata bonus) * (1 - weight)
    const recencyBonus = result.metadata?.indexed_at
      ? Math.max(
          0,
          1 -
            (Date.now() - new Date(result.metadata.indexed_at).getTime()) /
              (30 * 24 * 60 * 60 * 1000),
        )
      : 0;

    return result.relevance * weight + recencyBonus * (1 - weight);
  }
}
```

#### Testing

- Unit tests: Vector store index/query operations
- Unit tests: Document formatter functions
- Integration tests: Full retrieval pipeline with test data
- Tests: Hybrid search with and without filters

---

### Phase 4: Agent Tools and Execution Logic

#### Goals

- Define roster action tools with validation and confirmation gates
- Implement LangChain agent executor with custom reasoning loop
- Build tool validation and authorization layer

#### Tool Definitions

```typescript
// src/tools/schemas.ts

export const toolSchemas = {
  updateShift: {
    name: "updateShift",
    description: "Update or assign a shift to a nurse",
    schema: {
      type: "object",
      properties: {
        shiftId: { type: "string", description: "ID of the shift" },
        nurseId: { type: "string", description: "ID of the nurse" },
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        reason: { type: "string", description: "Reason for the change" },
      },
      required: ["shiftId", "nurseId", "date"],
    },
  },
  getCoverage: {
    name: "getCoverage",
    description: "Check coverage for a specific date and unit",
    schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        unit: { type: "string", description: "Unit name (e.g., ICU, ER)" },
      },
      required: ["date", "unit"],
    },
  },
  queryRoster: {
    name: "queryRoster",
    description: "Query roster for shifts, assignments, or availability",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language query about roster",
        },
      },
      required: ["query"],
    },
  },
  getNurseInfo: {
    name: "getNurseInfo",
    description: "Get information about a specific nurse",
    schema: {
      type: "object",
      properties: {
        nurseId: { type: "string", description: "ID of the nurse" },
      },
      required: ["nurseId"],
    },
  },
};
```

#### Tool Registry with Validation

```typescript
// src/tools/registry.ts

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private validators: Map<string, ToolValidator> = new Map();

  constructor(
    private db: Database,
    private eventBus: EventBus,
  ) {
    this.registerBuiltInTools();
  }

  private registerBuiltInTools() {
    this.register({
      name: "updateShift",
      description: toolSchemas.updateShift.description,
      schema: toolSchemas.updateShift.schema,

      validate: async (input: unknown) => {
        const parsed = this.parseInput(input, toolSchemas.updateShift.schema);

        // Check authorization
        const user = this.getCurrentUser();
        const canModify = await this.db.query(
          "SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission = $2",
          [user.id, "modify_roster"],
        );

        if (!canModify.length) {
          return {
            valid: false,
            error: "Unauthorized: No permission to modify roster",
          };
        }

        // Check business rules
        const nurse = await this.db.query(
          "SELECT * FROM nurses WHERE id = $1",
          [parsed.nurseId],
        );

        if (!nurse.length) {
          return { valid: false, error: `Nurse ${parsed.nurseId} not found` };
        }

        // Check for conflicts
        const conflicts = await this.db.query(
          "SELECT * FROM shifts WHERE nurse_id = $1 AND date = $2 AND id != $3",
          [parsed.nurseId, parsed.date, parsed.shiftId],
        );

        if (conflicts.length > 0) {
          return {
            valid: false,
            error: `Nurse already assigned on ${parsed.date}`,
          };
        }

        return { valid: true };
      },

      execute: async (input: unknown, context: ToolContext) => {
        const parsed = this.parseInput(input, toolSchemas.updateShift.schema);

        // Stage the change (don't commit yet)
        const stagingId = generateId();
        const stagingResult = await this.db.query(
          `
          INSERT INTO shift_staging (id, shift_id, nurse_id, date, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
          [stagingId, parsed.shiftId, parsed.nurseId, parsed.date, "pending"],
        );

        // Return staging result, not final
        return {
          success: true,
          data: stagingResult[0],
          stagingId,
          requiresConfirmation: true,
          message: `Shift update staged. Requires confirmation.`,
        };
      },

      shouldConfirm: (input: unknown) => true, // Always require confirmation for mutations
    });

    // Similar for other tools...
  }

  async executeWithConfirmation(
    toolName: string,
    input: unknown,
    confirmationToken: string,
  ): Promise<ToolResult> {
    // Verify confirmation token is valid and not expired
    const confirmation = await this.db.query(
      `
      SELECT * FROM pending_confirmations WHERE token = $1 AND expires_at > NOW()
    `,
      [confirmationToken],
    );

    if (!confirmation.length) {
      throw new Error("Invalid or expired confirmation token");
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Commit the staged change
    const result = await tool.executeStaged?.(input, confirmationToken);

    this.eventBus.emit({
      type: "tool_executed",
      toolName,
      input,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  getSchema(toolName: string) {
    return this.tools.get(toolName)?.schema;
  }

  private parseInput(input: unknown, schema: any) {
    // Validate input against schema
    return input;
  }

  private getCurrentUser() {
    // Return from context
    return { id: "user123" };
  }
}
```

#### LangChain Agent Executor

```typescript
// src/orchestration/agent-executor.ts

export class AgentExecutor implements AgentOrchestrator {
  private llmProvider: ProviderManager;
  private toolRegistry: ToolRegistry;
  private retriever: Retriever;
  private conversationManager: ConversationManager;

  constructor(
    llmProvider: ProviderManager,
    toolRegistry: ToolRegistry,
    retriever: Retriever,
    conversationManager: ConversationManager,
    private config: AgentConfig,
  ) {
    this.llmProvider = llmProvider;
    this.toolRegistry = toolRegistry;
    this.retriever = retriever;
    this.conversationManager = conversationManager;
  }

  async *processQuery(
    userQuery: string,
    sessionContext: SessionContext,
  ): AsyncGenerator<AgentStep> {
    const conversationId = sessionContext.conversationId;
    let iteration = 0;

    // 1. Retrieve relevant context
    const retrievedContext = await this.retriever.retrieve(userQuery, {
      docType: "assignment,rule,nurse_profile",
      unit: sessionContext.userUnit,
    });

    yield {
      type: "thinking",
      reasoning: `Retrieved ${retrievedContext.length} relevant documents from roster`,
    };

    // 2. Build system prompt with tools and context
    const systemPrompt = this.buildSystemPrompt(
      retrievedContext,
      sessionContext,
    );

    // 3. Load conversation history
    const history = await this.conversationManager.getHistory(conversationId);

    // 4. Agent loop
    while (iteration < this.config.maxIterations) {
      iteration++;

      // Call LLM with tools
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userQuery },
      ];

      const response = await this.llmProvider.chat(messages, {
        maxTokens: this.config.contextWindowTokens,
        tools: this.toolRegistry.list(),
      });

      // Check if LLM wants to call a tool
      if (response.toolCall) {
        const { toolName, toolInput } = response.toolCall;

        // Validate tool
        const validation = await this.toolRegistry.validateTool(
          toolName,
          toolInput,
        );
        if (!validation.valid) {
          yield {
            type: "thinking",
            reasoning: `Tool validation failed: ${validation.error}`,
          };
          continue;
        }

        // Execute tool or request confirmation
        const tool = this.toolRegistry.get(toolName);
        const shouldConfirm = tool.shouldConfirm(toolInput);

        if (shouldConfirm) {
          // Stage the change and request confirmation from user
          const confirmationToken = await this.stageToolExecution(
            toolName,
            toolInput,
            sessionContext,
          );

          yield {
            type: "confirmation_required",
            tool: {
              name: toolName,
              params: toolInput,
              confirmationRequired: true,
              confirmationToken,
            },
            reasoning: `This action modifies the roster. Requires your confirmation.`,
          };

          // Wait for confirmation (will be provided via API callback)
          // For now, we yield and the orchestrator handles it
          return;
        } else {
          // Execute read-only tool immediately
          const result = await tool.execute(toolInput, sessionContext);

          yield {
            type: "tool_call",
            tool: { name: toolName, params: toolInput },
            result,
          };

          // Add to conversation history
          await this.conversationManager.addMessage(conversationId, {
            role: "assistant",
            content: `Called ${toolName}`,
            toolCall: { name: toolName, input: toolInput },
          });

          await this.conversationManager.addMessage(conversationId, {
            role: "user",
            content: JSON.stringify(result),
          });
        }
      } else if (response.stopReason === "end_turn") {
        // Agent finished
        yield {
          type: "complete",
          finalResponse: response.content,
        };

        await this.conversationManager.addMessage(conversationId, {
          role: "assistant",
          content: response.content,
        });

        return;
      }
    }

    yield {
      type: "error",
      error: {
        message: "Agent max iterations reached",
        code: "MAX_ITERATIONS",
      },
    };
  }

  private buildSystemPrompt(
    retrievedContext: RetrievalResult[],
    sessionContext: SessionContext,
  ): string {
    const tools = this.toolRegistry
      .list()
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");

    const context = retrievedContext
      .map((r) => `[${r.source}] ${r.content}`)
      .join("\n\n");

    return `
You are a helpful roster management AI assistant. You help nurses and managers with shift assignments, coverage checks, and availability queries.

Current Context:
- User: ${sessionContext.userId}
- Unit: ${sessionContext.userUnit}
- Time: ${new Date().toISOString()}

Recent Roster Information:
${context}

Available Tools:
${tools}

Guidelines:
- Always confirm before making roster changes
- Check coverage rules before assigning shifts
- Prioritize nurse preferences when possible
- Ask for clarification if the request is ambiguous
- Never modify shifts without explicit confirmation

When you need to call a tool, respond with the tool name and parameters.
    `.trim();
  }

  private async stageToolExecution(
    toolName: string,
    toolInput: unknown,
    sessionContext: SessionContext,
  ): Promise<string> {
    const confirmationToken = generateToken();

    await this.conversationManager.addPendingConfirmation(
      sessionContext.conversationId,
      {
        toolName,
        input: toolInput,
        token: confirmationToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      },
    );

    return confirmationToken;
  }
}
```

#### Testing

- Unit tests: Tool validation with various inputs
- Unit tests: Authorization checks
- Integration tests: Full agent loop with mocked LLM
- Tests: Confirmation flow (stage → confirm → execute)

---

### Phase 5: Backend and Frontend Integration

#### API Endpoints

```typescript
// src/api/routes.ts

export function createAgentRouter(
  executor: AgentExecutor,
  conversationManager: ConversationManager,
) {
  return {
    async POST_query(req: Request): Promise<Response> {
      const { query, sessionId, userId, context } = await req.json();

      // Get or create session
      let session = sessionId
        ? await conversationManager.getSession(sessionId)
        : await conversationManager.createSession(userId, context);

      // Start agent loop
      const generator = executor.processQuery(query, session);

      // Stream responses
      const readable = ReadableStream.from(async function* () {
        for await (const step of generator) {
          yield JSON.stringify(step) + "\n";
        }
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "X-Session-Id": session.conversationId,
        },
      });
    },

    async POST_confirm(req: Request): Promise<Response> {
      const { conversationId, confirmationToken, confirmed } = await req.json();

      if (!confirmed) {
        await conversationManager.revertConfirmation(
          conversationId,
          confirmationToken,
        );
        return new Response(JSON.stringify({ status: "reverted" }));
      }

      // Execute the staged tool
      const pending = await conversationManager.getPendingConfirmation(
        conversationId,
        confirmationToken,
      );

      const tool = toolRegistry.get(pending.toolName);
      const result = await tool.executeStaged(pending.input, confirmationToken);

      return new Response(
        JSON.stringify({
          status: "confirmed",
          result,
        }),
      );
    },

    async GET_session(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("id");

      const session = await conversationManager.getSession(sessionId);

      return new Response(JSON.stringify(session));
    },

    async POST_health(req: Request): Promise<Response> {
      const providers = providerManager.getProviderStatus();
      const vectorStats = await vectorStore.getStats();

      return new Response(
        JSON.stringify({
          status: "healthy",
          providers,
          vectorStore: vectorStats,
        }),
      );
    },
  };
}
```

#### Frontend Integration Example

```typescript
// Client-side integration

class RosterAgentClient {
  constructor(
    private apiBase: string,
    private sessionId?: string,
  ) {}

  async query(userQuery: string): AsyncGenerator<AgentStep> {
    const response = await fetch(`${this.apiBase}/api/agent/query`, {
      method: "POST",
      body: JSON.stringify({
        query: userQuery,
        sessionId: this.sessionId,
        userId: getCurrentUser().id,
      }),
    });

    this.sessionId = response.headers.get("X-Session-Id");

    // Stream NDJSON responses
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    for await (const chunk of reader!) {
      const line = decoder.decode(chunk).trim();
      if (line) {
        const step = JSON.parse(line);
        yield step;
      }
    }
  }

  async confirm(confirmationToken: string, confirmed: boolean): Promise<void> {
    await fetch(`${this.apiBase}/api/agent/confirm`, {
      method: "POST",
      body: JSON.stringify({
        conversationId: this.sessionId,
        confirmationToken,
        confirmed,
      }),
    });
  }
}

// Usage in UI
const client = new RosterAgentClient("https://api.example.com");

for await (const step of client.query("Assign John to ICU on May 18")) {
  if (step.type === "thinking") {
    console.log("Agent thinking:", step.reasoning);
  } else if (step.type === "confirmation_required") {
    // Show confirmation dialog
    const confirmed = await showConfirmationDialog(step.tool);
    await client.confirm(step.tool.confirmationToken, confirmed);
  } else if (step.type === "complete") {
    console.log("Agent response:", step.finalResponse);
  }
}
```

---

### Phase 6: Testing and Rollout

#### Test Strategy

```typescript
// __tests__/integration/agent-e2e.test.ts

describe("Agent E2E", () => {
  let executor: AgentExecutor;
  let db: Database;
  let vectorStore: PgvectorStore;

  beforeEach(async () => {
    // Setup test database
    db = await setupTestDB();

    // Seed test data
    await seedTestRoster(db);
    await seedTestDocuments(db, vectorStore);

    // Initialize components
    vectorStore = new PgvectorStore(db, mockEmbedding);
    const retriever = new RetrievalPipeline(
      vectorStore,
      mockEmbedding,
      db,
      eventBus,
    );
    const toolRegistry = new ToolRegistry(db, eventBus);
    const conversationManager = new ConversationManager();
    const providerManager = new ProviderManager([
      { name: "test-llm", model: "mock", timeout: 5000 },
    ]);

    executor = new AgentExecutor(
      providerManager,
      toolRegistry,
      retriever,
      conversationManager,
      { maxIterations: 10 },
    );
  });

  it("should handle a simple roster query", async () => {
    const steps: AgentStep[] = [];

    for await (const step of executor.processQuery(
      "Who is assigned on May 18?",
      {
        conversationId: "test-1",
        userId: "user-1",
        userUnit: "ICU",
      },
    )) {
      steps.push(step);
    }

    // Verify agent completed successfully
    const lastStep = steps[steps.length - 1];
    expect(lastStep.type).toBe("complete");
    expect(lastStep.finalResponse).toContain("May 18");
  });

  it("should require confirmation for roster mutations", async () => {
    const steps: AgentStep[] = [];

    for await (const step of executor.processQuery(
      "Assign John to ICU on May 18",
      {
        conversationId: "test-2",
        userId: "user-1",
        userUnit: "ICU",
      },
    )) {
      steps.push(step);

      if (step.type === "confirmation_required") {
        // Verify confirmation token is present
        expect(step.tool?.confirmationToken).toBeDefined();
      }
    }

    // Verify we hit confirmation step
    const confirmationStep = steps.find(
      (s) => s.type === "confirmation_required",
    );
    expect(confirmationStep).toBeDefined();
  });

  it("should handle provider fallback", async () => {
    // Mock primary provider to fail
    providerManager.simulate("primary_failure");

    const steps: AgentStep[] = [];

    for await (const step of executor.processQuery("Check coverage", {
      conversationId: "test-3",
      userId: "user-1",
      userUnit: "ICU",
    })) {
      steps.push(step);
    }

    // Verify it still completed (using fallback)
    expect(steps.some((s) => s.type === "complete")).toBe(true);
  });

  afterEach(async () => {
    await db.close();
  });
});
```

#### Deployment Checklist

```markdown
## Pre-Production Checklist

### Infrastructure

- [ ] PostgreSQL 13+ with pgvector extension installed
- [ ] Connection pool configured (10-20 connections)
- [ ] HNSW indexes created on `embedding` column
- [ ] Backups configured for `roster_documents` table
- [ ] Redis configured for session store (optional but recommended)

### Configuration

- [ ] Primary LLM API key set (AGENT_LLM_PRIMARY_KEY)
- [ ] Fallback LLM URL set (AGENT_LLM_FALLBACK_URL)
- [ ] Embedding provider configured (EMBEDDING_PROVIDER, EMBEDDING_MODEL)
- [ ] Database connection pool size tuned
- [ ] Session TTL configured appropriately
- [ ] Confirmation timeout set (default: 5 minutes)

### Database Migration

- [ ] Run schema migration: `psql -f schema.sql`
- [ ] Verify pgvector extension loaded
- [ ] Run seed data (assignments, nurse profiles, rules)
- [ ] Build initial vector indexes (may take minutes for large datasets)

### Secrets Management

- [ ] Store all API keys in secure vault (Vault, Sealed Secrets, etc.)
- [ ] Database credentials secured
- [ ] Rotate keys periodically
- [ ] Audit secret access logs

### Monitoring & Observability

- [ ] LangSmith tracing enabled if using
- [ ] Metrics collection configured
- [ ] Alert thresholds set for:
  - LLM provider failures
  - Vector store query latency
  - Confirmation timeout rate
  - Tool execution errors
- [ ] Logging aggregation set up (CloudWatch, DataDog, etc.)

### Testing

- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests with real DB
- [ ] E2E tests with test LLM
- [ ] Load test: 10+ concurrent queries
- [ ] Provider fallback test
- [ ] Confirmation flow test
- [ ] Error recovery test

### Feature Flags

- [ ] Agent mutations disabled by default
- [ ] Gradual rollout (5% → 25% → 100%)
- [ ] Kill switch ready for immediate disable

### Security

- [ ] Tool authorization rules enforced
- [ ] Input validation on all tool calls
- [ ] Rate limiting per user/session
- [ ] SQL injection prevention verified
- [ ] Prompt injection prevention tested
- [ ] CORS configured appropriately
- [ ] Authentication/authorization required for mutations

### Documentation

- [ ] API documentation published
- [ ] Environment variable guide created
- [ ] Runbook for troubleshooting
- [ ] Tool definitions documented
- [ ] Emergency disable procedure documented
```

---

## Implementation Constraints & Trade-offs

### Constraints

1. **Cloudflare Workers Compatibility**
   - No heavy dependencies (use bundled pgvector client)
   - Connection pooling essential for serverless
   - Avoid runtime-specific clients

2. **Token Budget**
   - Context window for agent ~4000 tokens
   - Retrieved documents must fit within this
   - Implement context trimming if needed

3. **Embedding Costs**
   - Cache embeddings aggressively
   - Use smaller model for dev (e.g., `text-embedding-3-small`)
   - Batch embedding operations

### Trade-offs Made

| Decision                             | Rationale                                       | Alternatives                          |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------- |
| **pgvector over Pinecone**           | Single source of truth, ACID transactions, cost | Pinecone (scale), in-memory (latency) |
| **LangChain abstraction**            | Standard interfaces, wide adoption              | Custom agent loop (control)           |
| **Confirmation gates for mutations** | Safety first, audit trail                       | Direct execution (speed)              |
| **Streaming responses**              | Better UX for long operations                   | Polling (complexity)                  |
| **Event-driven logging**             | Loose coupling, easy to extend                  | Direct logging (simplicity)           |

---

## Environment Variables Reference

```bash
# LLM Provider
AGENT_LLM_PRIMARY=anthropic                    # or 'openai', 'ollama'
AGENT_LLM_PRIMARY_MODEL=claude-3-sonnet
AGENT_LLM_PRIMARY_KEY=sk-...
AGENT_LLM_PRIMARY_URL=https://api.anthropic.com

# Fallback (Local)
AGENT_LLM_FALLBACK_URL=http://localhost:11434
AGENT_LLM_FALLBACK_MODEL=mistral

# pgvector & Database
DATABASE_URL=postgresql://user:pass@localhost/roster_db
PGVECTOR_DIMENSION=1536
AGENT_DB_MAX_CONNECTIONS=10

# Embeddings
EMBEDDING_PROVIDER=openai                      # or 'ollama'
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=sk-...

# Agent Behavior
AGENT_MAX_ITERATIONS=10
AGENT_CONTEXT_WINDOW=4000
AGENT_SESSION_TTL_MINUTES=30
AGENT_CONFIRMATION_TIMEOUT_MINUTES=5

# Observability
LOG_LEVEL=info
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=...

# Feature Flags
ENABLE_AGENT_MUTATIONS=false
REQUIRE_CONFIRMATION=true
```

---

## Success Metrics

- **Accuracy**: 95%+ accuracy on read queries
- **Latency**: Agent queries complete in <5s (p95)
- **Safety**: 0 unconfirmed mutations
- **Availability**: 99.5% uptime with fallback LLM
- **Cost**: <$0.10 per query with primary LLM
- **User Adoption**: 50%+ of daily users using agent within 3 months

---

## Next Steps

1. **Week 1-2**: Implement Phase 1 (scaffolding) + Phase 2 (provider setup)
2. **Week 3-4**: Implement Phase 3 (pgvector pipeline)
3. **Week 5-6**: Implement Phase 4 (tools & agent executor)
4. **Week 7-8**: Implement Phase 5 (API & frontend integration)
5. **Week 9-10**: Testing, refinement, documentation
6. **Week 11-12**: Staged rollout with feature flags
