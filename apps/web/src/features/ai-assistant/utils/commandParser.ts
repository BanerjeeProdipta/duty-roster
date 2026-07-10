import type { NameRecord } from "@Duty-Roster/ai-parser";
import {
	bengaliToEnglish,
	bestNameMatch,
	matchName,
	parseDateFromText,
} from "@Duty-Roster/ai-parser";

const SHIFT_WORDS = ["morning", "evening", "night", "off"] as const;

const SKIP_WORDS = new Set([
	...SHIFT_WORDS,
	"assign",
	"sign",
	"set",
	"put",
	"schedule",
	"change",
	"to",
	"on",
	"a",
	"the",
	"for",
	"as",
	"at",
	"tomorrow",
	"today",
	"can",
	"you",
	"i",
	"want",
	"would",
	"shift",
	"please",
	"an",
	"of",
	"fun",
	"great",
	"busy",
	"long",
	"short",
	"hard",
	"easy",
	"good",
	"bad",
	"nice",
]);

export interface ParsedCommand {
	shift: string | null;
	date: string | null;
	nurseName: string | null;
	nurseId: string | null;
	englishName: string | null;
	action: string | null;
	missingFields: string[];
}

export function parseCommand(
	text: string,
	nurses?: NameRecord[],
): ParsedCommand {
	const lower = text.toLowerCase().replace(/[.,!?;:]/g, "");
	const words = lower.split(/\s+/).filter(Boolean);

	const shift = SHIFT_WORDS.find((s) => words.includes(s)) ?? null;
	const date = parseDateFromText(words);
	const nameWords = words.filter((w) => !SKIP_WORDS.has(w));

	let nurseName: string | null = null;
	let nurseId: string | null = null;
	let englishName: string | null = null;

	if (nurses && nurses.length > 0) {
		const match = matchName(nameWords.join(" "), nurses);
		if (match && match.confidence > 0.5) {
			nurseName = match.bengaliName;
			nurseId = match.nurseId;
			englishName = bengaliToEnglish(match.bengaliName);
		}
	} else {
		const staticMatch = bestNameMatch(nameWords);
		if (staticMatch) {
			nurseName = staticMatch;
			englishName = bengaliToEnglish(staticMatch);
		}
	}

	console.log(
		"[commandParser] input:",
		text,
		"| shift:",
		shift,
		"| date:",
		date,
		"| nameWords:",
		nameWords,
		"| nurseName:",
		nurseName,
		"| nurseId:",
		nurseId,
	);

	const missingFields: string[] = [];
	if (!nurseName) missingFields.push("nurse");
	if (!shift) missingFields.push("shift");
	if (!date) missingFields.push("date");

	const action = missingFields.length === 0 ? "update" : null;

	return {
		shift,
		date,
		nurseName,
		nurseId,
		englishName,
		action,
		missingFields,
	};
}
