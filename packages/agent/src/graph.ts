import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from "@langchain/core/messages";
import { createLLM } from "./llm";
import { listNursesTool } from "./tools/list-nurses";
import { queryScheduleTool } from "./tools/query-schedule";
import { queryShiftTool } from "./tools/query-shift";
import { setShiftTool } from "./tools/set-shift";

const tools = [queryScheduleTool, queryShiftTool, listNursesTool, setShiftTool];

const today = new Date();
const currentDate = today.toISOString().slice(0, 10);
const currentMonth = today.toLocaleString("default", { month: "long" });
const currentYear = today.getFullYear();

const SYSTEM_PROMPT = `You are a duty roster assistant for a nursing schedule.

Current date: ${currentDate} (${currentMonth} ${currentYear})

For day numbers like "27", assume current month/year → YYYY-MM-DD.

Available shifts: morning, evening, night, off.

Tools:
- querySchedule(nurseName, dateKey) — check a nurse's shift on a date
- queryShift(shiftName, dateKey) — list nurses on a shift on a date
  Valid shiftName values: "morning", "evening", "night"
- listNurses() — all active nurses
- setShift(nurseName, shiftName, dateKey) — assign or update a nurse's shift for a date

Nurse names are stored in Bengali script (e.g. জয়শ্রী, সেলিনা). The user may refer to nurses by English phonetic names. All tools accept both Bengali and English names.

When the user wants to assign, set, update, or change a nurse's shift, use the setShift tool. Do NOT use query tools for set/update requests.

Call ONE tool at a time. After a tool returns, respond to the user IMMEDIATELY with the result. Do NOT call any more tools after you get a result.`;

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
