const MONTH_NAMES: Record<string, number> = {
	january: 1,
	jan: 1,
	february: 2,
	feb: 2,
	march: 3,
	mar: 3,
	april: 4,
	apr: 4,
	may: 5,
	june: 6,
	jun: 6,
	july: 7,
	jul: 7,
	august: 8,
	aug: 8,
	september: 9,
	sep: 9,
	sept: 9,
	october: 10,
	oct: 10,
	november: 11,
	nov: 11,
	december: 12,
	dec: 12,
};

const DAY_NAMES: Record<string, number> = {
	sunday: 0,
	sun: 0,
	monday: 1,
	mon: 1,
	tuesday: 2,
	tue: 2,
	tues: 2,
	wednesday: 3,
	wed: 3,
	thursday: 4,
	thu: 4,
	thurs: 4,
	friday: 5,
	fri: 5,
	saturday: 6,
	sat: 6,
};

function ordinalToNumber(word: string): number | null {
	const ordinals: Record<string, number> = {
		first: 1,
		second: 2,
		third: 3,
		fourth: 4,
		fifth: 5,
		sixth: 6,
		seventh: 7,
		eighth: 8,
		ninth: 9,
		tenth: 10,
		eleventh: 11,
		twelfth: 12,
		thirteenth: 13,
		fourteenth: 14,
		fifteenth: 15,
		sixteenth: 16,
		seventeenth: 17,
		eighteenth: 18,
		nineteenth: 19,
		twentieth: 20,
		"twenty first": 21,
		"twenty second": 22,
		"twenty third": 23,
		"twenty fourth": 24,
		"twenty fifth": 25,
		"twenty sixth": 26,
		"twenty seventh": 27,
		"twenty eighth": 28,
		"twenty ninth": 29,
		thirtieth: 30,
		"thirty first": 31,
	};

	const num = Number.parseInt(word, 10);
	if (!Number.isNaN(num) && num >= 1 && num <= 31) return num;

	const cleaned = word.replace(/(st|nd|rd|th)$/i, "").toLowerCase();
	const num2 = Number.parseInt(cleaned, 10);
	if (!Number.isNaN(num2) && num2 >= 1 && num2 <= 31) return num2;

	return ordinals[word.toLowerCase()] ?? null;
}

function parseTomorrow(base: Date): Date {
	const d = new Date(base);
	d.setDate(d.getDate() + 1);
	return d;
}

function parseDayOfWeek(dayName: string, base: Date): Date | null {
	const targetDay = DAY_NAMES[dayName.toLowerCase()];
	if (targetDay === undefined) return null;

	const d = new Date(base);
	const currentDay = d.getDay();
	let diff = targetDay - currentDay;
	if (diff <= 0) diff += 7;
	d.setDate(d.getDate() + diff);
	return d;
}

function parseNextDayOfWeek(dayName: string, base: Date): Date | null {
	const targetDay = DAY_NAMES[dayName.toLowerCase()];
	if (targetDay === undefined) return null;

	const d = new Date(base);
	const currentDay = d.getDay();
	let diff = targetDay - currentDay;
	if (diff <= 0) diff += 7;
	d.setDate(d.getDate() + diff);
	return d;
}

export function parseDate(text: string, base?: Date): Date | null {
	const now = base ?? new Date();
	const lower = text.toLowerCase().trim();

	if (lower === "today") return new Date(now);
	if (lower === "tomorrow") return parseTomorrow(now);

	const nextMatch = lower.match(/^next\s+(.+)$/);
	if (nextMatch) {
		const dayName = nextMatch[1]!;
		return parseNextDayOfWeek(dayName, now);
	}

	const dayOfWeek = parseDayOfWeek(lower, now);
	if (dayOfWeek) return dayOfWeek;

	const monthDayMatch = lower.match(
		/^(?:on\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)$/i,
	);
	if (monthDayMatch) {
		const day = Number.parseInt(monthDayMatch[1]!, 10);
		const monthName = monthDayMatch[2]!.toLowerCase();
		const month = MONTH_NAMES[monthName];
		if (month && day >= 1 && day <= 31) {
			const year =
				month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
			return new Date(year, month - 1, day);
		}
	}

	const monthDayMatch2 = lower.match(
		/^(?:on\s+)?([a-z]+)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?$/i,
	);
	if (monthDayMatch2) {
		const monthName = monthDayMatch2[1]!.toLowerCase();
		const month = MONTH_NAMES[monthName];
		const day = Number.parseInt(monthDayMatch2[2]!, 10);
		if (month && day >= 1 && day <= 31) {
			const year =
				month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
			return new Date(year, month - 1, day);
		}
	}

	const theDayMatch = lower.match(
		/^(?:on\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?$/,
	);
	if (theDayMatch) {
		const day = Number.parseInt(theDayMatch[1]!, 10);
		if (day >= 1 && day <= 31) {
			const d = new Date(now.getFullYear(), now.getMonth(), day);
			if (d < now) {
				d.setMonth(d.getMonth() + 1);
			}
			return d;
		}
	}

	const ordinalMatch = lower.match(
		/^(?:on\s+)?(?:the\s+)?([a-z\s]+?)(?:\s+of\s+|\s+)([a-z]+)$/i,
	);
	if (ordinalMatch) {
		const day = ordinalToNumber(ordinalMatch[1]!);
		const monthName = ordinalMatch[2]!.toLowerCase();
		const month = MONTH_NAMES[monthName];
		if (day && month) {
			const year =
				month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
			return new Date(year, month - 1, day);
		}
	}

	return null;
}

export function formatDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}
