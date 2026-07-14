import { countSchedulesInMonth } from "../roster/db";
import { generateRoster } from "../roster/service";

function getTargetYearMonth(now = new Date()) {
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth() + 1; // current month, 1-indexed
	return month === 12
		? { year: year + 1, month: 1 }
		: { year, month: month + 1 };
}

async function main() {
	const { year, month } = getTargetYearMonth();
	console.log(
		`[generate-next-month] Target: ${year}-${String(month).padStart(2, "0")}`,
	);

	const existing = await countSchedulesInMonth(year, month);
	if (existing > 0) {
		console.log(
			`[generate-next-month] ${existing} schedule rows already exist. Skipping.`,
		);
		return;
	}

	const result = await generateRoster({ year, month });
	if (!result.success) {
		console.error("[generate-next-month] Generation failed:", result.error);
		process.exit(1);
	}
	console.log(`[generate-next-month] Roster generated for ${year}-${month}.`);
}

main().catch((err) => {
	console.error("[generate-next-month] Unhandled error:", err);
	process.exit(1);
});
