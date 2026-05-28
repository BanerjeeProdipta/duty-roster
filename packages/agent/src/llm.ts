import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";

export function createLLM() {
	const groqKey = process.env.GROQ_API_KEY;
	const openRouterKey = process.env.OPENO_ROUTER_API_KEY;

	if (groqKey) {
		return new ChatGroq({
			model: "meta-llama/llama-4-scout-17b-16e-instruct",
			temperature: 0,
			apiKey: groqKey,
		});
	}

	if (openRouterKey) {
		return new ChatOpenAI({
			model: "meta-llama/llama-3.1-8b-instruct",
			temperature: 0,
			apiKey: openRouterKey,
			configuration: {
				baseURL: "https://openrouter.ai/api/v1",
			},
		});
	}

	throw new Error(
		"No API key available. Set GROQ_API_KEY or OPENO_ROUTER_API_KEY.",
	);
}
