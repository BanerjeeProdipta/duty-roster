import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createLLM } from "./llm";
import { listNursesTool } from "./tools/list-nurses";
import { queryScheduleTool } from "./tools/query-schedule";
import { queryShiftTool } from "./tools/query-shift";

const tools = [queryScheduleTool, queryShiftTool, listNursesTool];

const today = new Date();
const currentDate = today.toISOString().slice(0, 10);
const currentMonth = today.toLocaleString("default", { month: "long" });
const currentYear = today.getFullYear();

const systemPrompt = `You are a duty roster assistant for a nursing schedule.

Current date: ${currentDate} (${currentMonth} ${currentYear})

For day numbers like "27", assume current month/year → YYYY-MM-DD.

Available shifts: morning, evening, night.

Tools:
- querySchedule(nurseName, dateKey) — check a nurse's shift on a date
- queryShift(shiftName, dateKey) — list nurses on a shift on a date
  Valid shiftName values: "morning", "evening", "night"
- listNurses() — all active nurses

Call ONE tool at a time. After a tool returns, respond to the user IMMEDIATELY with the result. Do NOT call any more tools after you get a result.`;

export function buildAgent(options?: { recursionLimit?: number }) {
	const agent = createReactAgent({
		llm: createLLM(),
		tools,
		prompt: systemPrompt,
	});

	return agent;
}
