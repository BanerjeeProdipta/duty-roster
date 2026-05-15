import { bestNameMatch, bengaliToEnglish, parseDateFromText } from "@Duty-Roster/voice-parser";

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
  englishName: string | null;
  action: string | null;
  missingFields: string[];
}

export function parseCommand(text: string): ParsedCommand {
  const lower = text.toLowerCase().replace(/[.,!?;:]/g, "");
  const words = lower.split(/\s+/).filter(Boolean);

  const shift = SHIFT_WORDS.find((s) => words.includes(s)) ?? null;
  const date = parseDateFromText(words);
  const nameWords = words.filter((w) => !SKIP_WORDS.has(w));
  const nurseName = bestNameMatch(nameWords);
  const englishName = nurseName ? bengaliToEnglish(nurseName) : null;

  const missingFields: string[] = [];
  if (!nurseName) missingFields.push("nurse");
  if (!shift) missingFields.push("shift");
  if (!date) missingFields.push("date");

  const action = missingFields.length === 0 ? "update" : null;

  return { shift, date, nurseName, englishName, action, missingFields };
}
