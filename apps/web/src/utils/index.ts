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

	const firstDay = new Date(y, m - 1, 1, 12, 0, 0);
	const lastDay = new Date(y, m, 0, 12, 0, 0);

	const current = new Date(firstDay);

	while (current <= lastDay) {
		dates.push(current.toISOString().split("T")[0]);
		current.setDate(current.getDate() + 1);
	}

	return dates;
}

export function getMonthDateRange(year?: number, month?: number) {
	const now = new Date();

	const y = year ?? now.getFullYear();
	const m = month ?? now.getMonth() + 1;

	const startDate = new Date(y, m - 1, 1);
	const endDate = new Date(y, m, 0);

	return {
		startDate: startDate.toISOString().split("T")[0],
		endDate: endDate.toISOString().split("T")[0],
	};
}
