export function getMonthName(year: number, month: number): string {
	return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}

export function getMonthDates(year?: number, month?: number): string[] {
	const now = new Date();
	const y = year ?? now.getFullYear();
	const m = month ?? now.getMonth() + 1;

	const dates: string[] = [];
	const lastDay = new Date(y, m, 0).getDate();

	for (let d = 1; d <= lastDay; d++) {
		dates.push(
			`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
		);
	}

	return dates;
}

export function getMonthDateRange(year?: number, month?: number) {
	const now = new Date();
	const y = year ?? now.getFullYear();
	const m = month ?? now.getMonth() + 1;

	const lastDay = new Date(y, m, 0).getDate();
	const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
	const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

	return {
		startDate: startStr,
		endDate: endStr,
	};
}
