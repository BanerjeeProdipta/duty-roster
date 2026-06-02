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

const WORD_NUMBER_VALUES: Record<string, number> = {
	zero: 0,
	one: 1,
	two: 2,
	three: 3,
	four: 4,
	five: 5,
	six: 6,
	seven: 7,
	eight: 8,
	nine: 9,
	ten: 10,
	eleven: 11,
	twelve: 12,
	thirteen: 13,
	fourteen: 14,
	fifteen: 15,
	sixteen: 16,
	seventeen: 17,
	eighteen: 18,
	nineteen: 19,
	twenty: 20,
	thirty: 30,
	forty: 40,
	fifty: 50,
	sixty: 60,
	seventy: 70,
	eighty: 80,
	ninety: 90,
	hundred: 100,
	thousand: 1000,
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

	return ordinals[cleaned] ?? null;
}

function parseWordNumber(word: string): number | null {
	const cleaned = word
		.replace(/-/g, " ")
		.replace(/\band\b/g, " ")
		.trim();
	if (!cleaned) return null;

	let total = 0;
	let current = 0;

	for (const token of cleaned.split(/\s+/)) {
		const value = WORD_NUMBER_VALUES[token];
		if (value === undefined) return null;

		if (value === 100) {
			current = current === 0 ? 100 : current * 100;
		} else if (value === 1000) {
			current = current === 0 ? 1 : current;
			total += current * 1000;
			current = 0;
		} else {
			current += value;
		}
	}

	return total + current;
}

function parseDayPart(text: string): number | null {
	const cleaned = text.replace(/-/g, " ").trim();
	const num = Number.parseInt(cleaned.replace(/(st|nd|rd|th)$/i, ""), 10);
	if (!Number.isNaN(num) && num >= 1 && num <= 31) return num;

	const ordinal = ordinalToNumber(cleaned);
	if (ordinal) return ordinal;

	const cardinal = parseWordNumber(cleaned);
	if (cardinal && cardinal >= 1 && cardinal <= 31) return cardinal;

	return null;
}

function parseYearPart(text: string): number | null {
	const cleaned = text
		.replace(/-/g, " ")
		.replace(/\band\b/g, " ")
		.trim();
	const numeric = Number(cleaned);
	if (Number.isInteger(numeric) && cleaned.length === 4) return numeric;

	const parsed = parseWordNumber(cleaned);
	if (parsed && parsed >= 1000 && parsed <= 9999) return parsed;

	return null;
}

function resolveYear(base: Date, month: number, day: number): number {
	const nowYear = base.getFullYear();
	const candidate = new Date(nowYear, month - 1, day);
	if (candidate >= base) return nowYear;
	return nowYear + 1;
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
	const lower = text.toLowerCase().trim().replace(/-/g, " ");

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
		/^(?:on\s+)?(?:the\s+)?([a-z]+)\s+([a-z0-9\s]+?)(?:\s+(\d{4}|[a-z\s]+))?$/i,
	);
	if (monthDayMatch) {
		const monthName = monthDayMatch[1]?.toLowerCase();
		const month = MONTH_NAMES[monthName];
		const dayPart = monthDayMatch[2]?.trim();
		const yearPart = monthDayMatch[3]?.trim();
		const day = parseDayPart(dayPart);
		const year = yearPart ? parseYearPart(yearPart) : null;
		if (month && day) {
			return new Date(year ?? resolveYear(now, month, day), month - 1, day);
		}
	}

	const monthDayMatch2 = lower.match(
		/^(?:on\s+)?(?:the\s+)?([a-z0-9\s]+?)(?:\s+of)?\s+([a-z]+)(?:\s+(\d{4}|[a-z\s]+))?$/i,
	);
	if (monthDayMatch2) {
		const dayPart = monthDayMatch2[1]?.trim();
		const monthName = monthDayMatch2[2]?.toLowerCase();
		const yearPart = monthDayMatch2[3]?.trim();
		const month = MONTH_NAMES[monthName];
		const day = parseDayPart(dayPart);
		const year = yearPart ? parseYearPart(yearPart) : null;
		if (month && day) {
			return new Date(year ?? resolveYear(now, month, day), month - 1, day);
		}
	}

	const theDayMatch = lower.match(
		/^(?:on\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?(?:\s+(\d{4}|[a-z\s]+))?$/,
	);
	if (theDayMatch) {
		const day = Number.parseInt(theDayMatch[1]!, 10);
		const yearPart = theDayMatch[2]?.trim();
		if (day >= 1 && day <= 31) {
			const year = yearPart ? parseYearPart(yearPart) : null;
			const d = new Date(
				year ?? resolveYear(now, now.getMonth() + 1, day),
				now.getMonth(),
				day,
			);
			if (!year && d < now) {
				d.setMonth(d.getMonth() + 1);
			}
			return d;
		}
	}

	const ordinalMatch = lower.match(
		/^(?:on\s+)?(?:the\s+)?([a-z\s]+?)(?:\s+of\s+|\s+)([a-z]+)(?:\s+(\d{4}|[a-z\s]+))?$/i,
	);
	if (ordinalMatch) {
		const dayPart = ordinalMatch[1]?.trim();
		const monthName = ordinalMatch[2]?.toLowerCase();
		const yearPart = ordinalMatch[3]?.trim();
		const day = parseDayPart(dayPart);
		const month = MONTH_NAMES[monthName];
		const year = yearPart ? parseYearPart(yearPart) : null;
		if (day && month) {
			return new Date(year ?? resolveYear(now, month, day), month - 1, day);
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
