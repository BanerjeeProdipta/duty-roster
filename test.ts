import { findSchedulesAndPreferencesByDateRange } from "./packages/api/src/features/roster/db";

async function run() {
	try {
		const res = await findSchedulesAndPreferencesByDateRange(
			new Date("2026-04-01"),
			new Date("2026-04-30"),
		);
		console.log("Success:", res.length);
		if (res.length > 0) {
			console.log(res[0]);
		}
		process.exit(0);
	} catch (err) {
		console.error("Error:", err);
		process.exit(1);
	}
}

run();
