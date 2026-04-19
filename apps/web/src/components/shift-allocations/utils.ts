import type { NurseData, NurseState } from "./types";

export function normalize(data: unknown, totalDays: number): NurseState[] {
	if (!data || !Array.isArray(data)) return [];

	return (data as NurseData[]).map((item) => {
		const m = Math.round((item.morning / 100) * totalDays);
		const e = Math.round((item.evening / 100) * totalDays);
		const n = Math.round((item.night / 100) * totalDays);
		const used = m + e + n;

		return {
			id: item.nurseId,
			name: item.name,
			morning: m,
			evening: e,
			night: n,
			off: Math.max(0, totalDays - used),
			active: item.active ?? true,
		};
	});
}

export function addMonths(date: Date, delta: number) {
	const d = new Date(date);
	d.setMonth(d.getMonth() + delta);
	return d;
}

export function formatMonth(date: Date) {
	return date.toLocaleString("default", {
		month: "long",
		year: "numeric",
	});
}

export function getDaysInMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
