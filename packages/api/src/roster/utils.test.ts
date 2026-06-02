import {
	formatDateKey,
	getCoverageForDay,
	getDaysInMonth,
	getDayType,
	isFriday,
	normalizeShiftId,
	shiftIdToShiftType,
} from "./utils";

describe("formatDateKey", () => {
	it("formats a Date into YYYY-MM-DD", () => {
		const date = new Date("2025-05-23T12:00:00Z");
		expect(formatDateKey(date)).toBe("2025-05-23");
	});

	it("passes through a string unchanged", () => {
		expect(formatDateKey("2025-05-23")).toBe("2025-05-23");
	});
});

describe("getDaysInMonth", () => {
	it("returns 31 for May", () => {
		expect(getDaysInMonth(2025, 5)).toBe(31);
	});

	it("returns 28 for February in a non-leap year", () => {
		expect(getDaysInMonth(2023, 2)).toBe(28);
	});

	it("returns 29 for February in a leap year", () => {
		expect(getDaysInMonth(2024, 2)).toBe(29);
	});
});

describe("isFriday", () => {
	it("returns true for a Friday", () => {
		expect(isFriday("2025-05-23")).toBe(true);
	});

	it("returns false for a Monday", () => {
		expect(isFriday("2025-05-19")).toBe(false);
	});
});

describe("normalizeShiftId", () => {
	it("strips shift_ prefix", () => {
		expect(normalizeShiftId("shift_morning")).toBe("morning");
	});

	it("returns 'off' for undefined", () => {
		expect(normalizeShiftId(undefined)).toBe("off");
	});

	it("returns 'off' for null", () => {
		expect(normalizeShiftId(null)).toBe("off");
	});
});

describe("shiftIdToShiftType", () => {
	it("maps morning shift id", () => {
		expect(shiftIdToShiftType("shift_morning")).toBe("morning");
	});

	it("maps evening shift id", () => {
		expect(shiftIdToShiftType("shift_evening")).toBe("evening");
	});

	it("maps night shift id", () => {
		expect(shiftIdToShiftType("shift_night")).toBe("night");
	});

	it("returns 'off' for null", () => {
		expect(shiftIdToShiftType(null)).toBe("off");
	});

	it("returns 'off' for unrecognised id", () => {
		expect(shiftIdToShiftType("shift_unknown")).toBe("off");
	});
});

describe("getDayType", () => {
	it("returns FRIDAY for a Friday", () => {
		expect(getDayType(2025, 5, 23)).toBe("FRIDAY");
	});

	it("returns WEEKDAY for a Monday", () => {
		expect(getDayType(2025, 5, 19)).toBe("WEEKDAY");
	});
});

describe("getCoverageForDay", () => {
	it("returns Friday coverage", () => {
		const coverage = getCoverageForDay("FRIDAY");
		expect(coverage).toEqual({ morning: 3, evening: 3, night: 2 });
	});

	it("returns weekday coverage", () => {
		const coverage = getCoverageForDay("WEEKDAY");
		expect(coverage).toEqual({ morning: 20, evening: 3, night: 2 });
	});
});
