import { findSchedulesAndPreferencesByDateRange } from "@Duty-Roster/api/features/roster/db";

async function run() {
	try {
		console.log("Starting DB query...");
		const res = await findSchedulesAndPreferencesByDateRange(
			new Date("2026-04-01"),
			new Date("2026-04-30"),
		);
		console.log("DB query finished. Rows:", res.length);
		if (res.length > 0) {
			console.log("First row assignments:", res[0].assignments);
			console.log("Type of assignments:", typeof res[0].assignments);
		}
		process.exit(0);
	} catch (err) {
		console.error("Error:", err);
		process.exit(1);
	}
}

run();
