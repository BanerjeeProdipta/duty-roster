import { SystemMessage } from "@langchain/core/messages";
import {
	END,
	MessagesAnnotation,
	START,
	StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createLLM } from "./llm";
import { listNursesTool } from "./tools/list-nurses";
import { queryScheduleTool } from "./tools/query-schedule";
import { queryShiftTool } from "./tools/query-shift";
import { setShiftTool } from "./tools/set-shift";

const tools = [queryScheduleTool, queryShiftTool, listNursesTool, setShiftTool];

const today = new Date();
const currentDate = today.toISOString().slice(0, 10);
const _currentMonth = today.toLocaleString("default", { month: "long" });
const _currentYear = today.getFullYear();

const SYSTEM_PROMPT = `You are a duty roster assistant. Current date: ${currentDate}.

CRITICAL: Be extremely concise. Use 1 sentence max. No filler like "To confirm" or "I need to know".

Rules:
- If the user asks "who", "what", "which", or "list", use queryShift, querySchedule, or listNurses.
- If the user wants to set/update a shift, use setShift.
- If info is missing for setShift, ask for JUST the missing field: "Which nurse?" or "Which date?".
- Use conversation history to resolve "it", "her", "him", or previously mentioned names/dates.
- Respond with ONLY the result or the briefest possible question.

Tools:
- querySchedule(nurseName, dateKey)
- queryShift(shiftName, dateKey)
- listNurses()
- setShift(nurseName, shiftName, dateKey)`;

const llm = createLLM().bindTools(tools);
const toolNode = new ToolNode(tools);

async function callModel(state: typeof MessagesAnnotation.State) {
	const messages = [new SystemMessage(SYSTEM_PROMPT), ...state.messages];
	const response = await llm.invoke(messages);
	return { messages: [response] };
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

export function buildAgent() {
	const agent = new StateGraph(MessagesAnnotation)
		.addNode("agent", callModel)
		.addNode("tools", toolNode)
		.addNode("format_response", formatResponse)
		.addEdge(START, "agent")
		.addConditionalEdges("agent", routeAfterAgent, {
			tools: "tools",
			format_response: "format_response",
		})
		.addEdge("tools", "agent")
		.addEdge("format_response", END)
		.compile();

	return agent;
}
