import { runSolver } from "./packages/api/src/roster/utils";

const payload = {
	nurses: ["n1", "n2", "n3"],
	days: 7,
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
	coverage: Array(7).fill({ morning: 0, evening: 0, night: 1 }),
	constraints: {
		max_consecutive_nights: 2,
		max_consecutive_days: 6,
		min_days_off_per_week: 1,
		night_constrain: 2,
	},
	unavailable: {},
};

async function run() {
	const res = await runSolver(payload);
	console.log(JSON.stringify(res, null, 2));
}

run();
