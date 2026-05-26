import { ChatGroq } from "@langchain/groq";

export function createLLM() {
	const apiKey = process.env.GROQ_API_KEY;
	if (!apiKey) {
		throw new Error("GROQ_API_KEY is required for the agent LLM");
	}

	return new ChatGroq({
		model: "llama-3.3-70b-versatile",
		temperature: 0,
		apiKey,
	});
}
