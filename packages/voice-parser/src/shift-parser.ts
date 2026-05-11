import type { ParsedCommand, NameRecord } from "./types";
import { matchName } from "./name-mapper";
import { parseDate, formatDateKey } from "./date-parser";

const SHIFT_KEYWORDS: Record<string, string> = {
	"morning": "morning",
	"morning shift": "morning",
	"day shift": "morning",
	"evening": "evening",
	"evening shift": "evening",
	"night": "night",
	"night shift": "night",
	"off": "off",
	"day off": "off",
	"leave": "off",
	"off duty": "off",
};

function extractShift(words: string[]): string | null {
	const text = words.join(" ");
	for (const [keyword, shift] of Object.entries(SHIFT_KEYWORDS)) {
		if (text.includes(keyword)) return shift;
	}
	return null;
}

function extractNameAndDate(
	words: string[],
	nurses: NameRecord[],
): { name: string | null; date: Date | null; dateKey: string | null } {
	const text = words.join(" ").toLowerCase();

	const onMatch = text.match(/\bon\s+(.+)/i);
	let datePhrase = "";
	let beforeDate = text;

	if (onMatch) {
		datePhrase = onMatch[1]!.trim();
		beforeDate = text.slice(0, onMatch.index).trim();
	}

	const date = datePhrase ? parseDate(datePhrase) : null;
	const dateKey = date ? formatDateKey(date) : null;

	const stopwords = new Set([
		"set", "assign", "put", "schedule", "make", "change", "move",
		"to", "a", "the", "for", "on", "as", "be", "please", "can", "you",
		"i", "want", "need", "would", "like", "could",
		"morning", "evening", "night", "off",
		"shift", "day", "leave", "duty",
		"today", "tomorrow",
	]);

	const nameWords = beforeDate
		.split(/\s+/)
		.filter((w) => !stopwords.has(w) && w.length > 1);

	const candidates: string[] = [];
	for (let len = Math.min(3, nameWords.length); len >= 1; len--) {
		for (let i = 0; i <= nameWords.length - len; i++) {
			candidates.push(nameWords.slice(i, i + len).join(" "));
		}
	}

	for (const candidate of candidates) {
		const match = matchName(candidate, nurses);
		if (match && match.confidence > 0.5) {
			return { name: match.nurseId, date, dateKey };
		}
	}

	return { name: null, date, dateKey };
}

export function parseShiftCommand(
	transcript: string,
	nurses: NameRecord[],
): ParsedCommand {
	if (!transcript || transcript.trim().length === 0) {
		return { type: "unknown", text: transcript };
	}

	const words = transcript
		.toLowerCase()
		.replace(/[.,!?;:]/g, "")
		.split(/\s+/)
		.filter((w) => w.length > 0);

	const shiftType = extractShift(words);

	const { name: nurseId, date, dateKey } = extractNameAndDate(words, nurses);

	if (!nurseId || !shiftType || !date || !dateKey) {
		return { type: "unknown", text: transcript };
	}

	const nurse = nurses.find((n) => n.id === nurseId);

	return {
		type: "set-shift",
		nurseId,
		nurseName: nurse?.name ?? nurseId,
		shiftType: shiftType as "morning" | "evening" | "night" | "off",
		date,
		dateKey,
	};
}
