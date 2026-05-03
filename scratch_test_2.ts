import { runSolver } from "./packages/api/src/roster/utils";

const payload = {
	nurses: ["n1", "n2", "n3"],
	days: 5,
	shifts: ["morning", "evening", "night"] as const,
	preferences: {
		n1: { morning: 0, evening: 0, night: 100 },
		n2: { morning: 0, evening: 0, night: 100 },
		n3: { morning: 0, evening: 0, night: 100 },
	},
	max_shifts_per_type: {
		n1: { morning: -1, evening: -1, night: 3 },
		n2: { morning: -1, evening: -1, night: 3 },
		n3: { morning: -1, evening: -1, night: 3 },
	},
	coverage: Array(5).fill({ morning: 0, evening: 0, night: 1 }),
	constraints: {
		max_consecutive_nights: 2,
		max_consecutive_days: 6,
		min_days_off_per_week: 1,
		night_constrain: 2,
	},
	unavailable: {},
	previous_shifts: {
		n1: ["night", "night"], // Should force Day 0 Off
		n2: ["off", "night"], // Should allow Day 0 Night, force Day 1 Off
		n3: ["off", "off"],
	},
};

async function run() {
	const res = await runSolver(payload);
	console.log(JSON.stringify(res, null, 2));
}

run();
