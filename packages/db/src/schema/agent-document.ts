import { index, jsonb, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

export const agentDocument = pgTable(
	"agent_document",
	{
		id: text("id").primaryKey(),

		content: text("content").notNull(),

		metadata: jsonb("metadata").$type<Record<string, unknown>>(),

		embedding: vector("embedding", { dimensions: 512 }),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		embeddingIdx: index("idx_agent_document_embedding").using(
			"hnsw",
			table.embedding.op("vector_cosine_ops"),
		),
	}),
);
