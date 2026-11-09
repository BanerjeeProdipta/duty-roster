import { SystemMessage } from "@langchain/core/messages";
import {
	END,
	MessagesAnnotation,
	START,
	StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createLLM } from "./llm";
import { generateRosterTool } from "./tools/generate-roster";
import { listNursesTool } from "./tools/list-nurses";
import { queryScheduleTool } from "./tools/query-schedule";
import { queryShiftTool } from "./tools/query-shift";
import { setShiftTool } from "./tools/set-shift";

const readTools = [queryScheduleTool, queryShiftTool, listNursesTool];
const writeTools = [setShiftTool, generateRosterTool];

const today = new Date();
const currentDate = today.toISOString().slice(0, 10);
const currentMonth = today.toLocaleString("default", { month: "long" });
const currentYear = today.getFullYear();

function buildSystemPrompt(includeWrites: boolean) {
	const writeRules = includeWrites
		? `- If the user wants to set/update a single nurse's shift on a specific date, use setShift.
- If the user wants to generate/create/build the roster for a month (e.g. "generate roster for August"), use generateRoster with that month's year/month — do NOT ask for a specific date. Assume the current year (${currentYear}) if the user doesn't say one. If no month is given at all, ask "Which month?".
- If info is missing for setShift, ask for JUST the missing field: "Which nurse?" or "Which date?".
`
		: `- You are in read-only mode. You cannot set shifts or generate rosters. If asked to do so, say the user must sign in as an admin to make changes.
`;

	const writeToolsDoc = includeWrites
		? `- setShift(nurseName, shiftName, dateKey)
- generateRoster(year, month)
`
		: "";

	return `You are a duty roster assistant. Current date: ${currentDate}.

CRITICAL: Be extremely concise. Use 1 sentence max. No filler like "To confirm" or "I need to know".
CRITICAL: Always reply in English, in English sentence structure, regardless of the input language or of any Bengali text (e.g. a nurse's name) appearing in a tool's result. Never switch to Bengali grammar, suffixes, or words — keep nurse names exactly as given, written in English.

Rules:
- If the user asks "who", "what", "which", or "list", use queryShift, querySchedule, or listNurses.
${writeRules}- Use conversation history to resolve "it", "her", "him", or previously mentioned names/dates.
- Respond with ONLY the result or the briefest possible question.

Tools:
- querySchedule(nurseName, dateKey)
- queryShift(shiftName, dateKey)
- listNurses()
${writeToolsDoc}
Current month: ${currentMonth} ${currentYear}.`;
}

function routeAfterAgent(state: typeof MessagesAnnotation.State) {
	const lastMessage = state.messages[state.messages.length - 1];
	if (
		lastMessage &&
		"tool_calls" in lastMessage &&
		Array.isArray(lastMessage.tool_calls) &&
		lastMessage.tool_calls.length > 0
	) {
		return "tools";
	}
	return "format_response";
}

async function formatResponse(state: typeof MessagesAnnotation.State) {
	const messages = state.messages;
	const lastMsg = messages[messages.length - 1];

	if (!lastMsg || typeof lastMsg.content !== "string") {
		return {};
	}

	const userMsg = [...messages].reverse().find((m) => m._getType() === "human");
	const userText = userMsg?.content?.toString().toLowerCase() ?? "";

	// Handle "how many" / "count" queries
	if (
		(userText.includes("how many") || /\bcount\b/.test(userText)) &&
		lastMsg.content.includes(", ")
	) {
		const count = lastMsg.content.split(", ").filter(Boolean).length;
		lastMsg.content = lastMsg.content.replace(
			/^(The following nurses are on|No nurses are on)/,
			(match) =>
				match === "No nurses are on"
					? "0 nurses are on"
					: `${count} nurses are on`,
		);
	}

	return {};
}

export function buildAgent({ readOnly = false }: { readOnly?: boolean } = {}) {
	const tools = readOnly ? readTools : [...readTools, ...writeTools];
	const llm = createLLM().bindTools(tools);
	const toolNode = new ToolNode(tools);
	const systemPrompt = buildSystemPrompt(!readOnly);

	async function callModel(state: typeof MessagesAnnotation.State) {
		const messages = [new SystemMessage(systemPrompt), ...state.messages];
		const response = await llm.invoke(messages);
		return { messages: [response] };
	}

	const agent = new StateGraph(MessagesAnnotation)
		.addNode("agent", callModel)
		.addNode("tools", toolNode)
		.addNode("format_response", formatResponse)
		.addEdge(START, "agent")
		.addConditionalEdges("agent", routeAfterAgent, {
			tools: "tools",
			format_response: "format_response",
		})
		// Tool results are already deterministic, English-templated strings —
		// skip a second LLM pass over them so it can't re-paraphrase into
		// Bengali when a resolved nurse name happens to be Bengali.
		.addEdge("tools", "format_response")
		.addEdge("format_response", END)
		.compile();

	return agent;
}
