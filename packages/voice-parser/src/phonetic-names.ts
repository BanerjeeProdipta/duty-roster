import { PHONETIC_MAP } from "./phonetic-map";

export function bestNameMatch(words: string[]): string | null {
	const all = words.join(" ").toLowerCase();

	for (const [key, names] of Object.entries(PHONETIC_MAP)) {
		if (all.includes(key)) return names[0] ?? null;
	}

	const skipPartial = new Set(["the", "on", "a", "an", "of", "to"]);
	const filtered = words.filter((w) => !skipPartial.has(w));
	for (const w of filtered) {
		for (const [key, names] of Object.entries(PHONETIC_MAP)) {
			if (key.includes(w) || w.includes(key)) return names[0] ?? null;
		}
	}

	for (let len = Math.min(3, words.length); len >= 2; len--) {
		for (let i = 0; i <= words.length - len; i++) {
			const phrase = words.slice(i, i + len).join(" ");
			for (const [key, names] of Object.entries(PHONETIC_MAP)) {
				if (phrase.includes(key) || key.includes(phrase))
					return names[0] ?? null;
			}
		}
	}

	return null;
}
