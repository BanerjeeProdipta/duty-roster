const NUMBER_WORDS: Record<string, number> = {
  "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
  "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
  "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14, "fifteenth": 15,
  "sixteenth": 16, "seventeenth": 17, "eighteenth": 18, "nineteenth": 19, "twentieth": 20,
  "twenty first": 21, "twenty second": 22, "twenty third": 23, "twenty fourth": 24, "twenty fifth": 25,
  "twenty sixth": 26, "twenty seventh": 27, "twenty eighth": 28, "twenty ninth": 29, "thirtieth": 30,
  "thirty first": 31,
  "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
  "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
  "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
  "twenty one": 21, "twenty two": 22, "twenty three": 23, "twenty four": 24, "twenty five": 25,
  "twenty six": 26, "twenty seven": 27, "twenty eight": 28, "twenty nine": 29, "thirty": 30,
  "thirty one": 31,
};

function parseWrittenDate(words: string[]): string | null {
  const text = words.join(" ");

  const sorted = Object.entries(NUMBER_WORDS).sort((a, b) => b[0].length - a[0].length);

  for (const [phrase, day] of sorted) {
    const pattern = new RegExp(`(?:^|\\s)${phrase}(?:$|\\s)`);
    if (pattern.test(text)) {
      const today = new Date();
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  return null;
}

export function parseDateFromText(words: string[]): string | null {
  const today = new Date();
  if (words.includes("tomorrow")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (words.includes("today")) {
    return today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const dateWords: string[] = [];
  const skip = new Set(["to", "on", "a", "an", "the", "of", "for", "shift", "please"]);
  for (const w of words) {
    if (!skip.has(w)) dateWords.push(w);
  }

  const written = parseWrittenDate(dateWords);
  if (written) return written;

  for (const w of words) {
    const n = Number(w);
    if (Number.isInteger(n) && n >= 1 && n <= 31) {
      const d = new Date(today.getFullYear(), today.getMonth(), n);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  return null;
}
