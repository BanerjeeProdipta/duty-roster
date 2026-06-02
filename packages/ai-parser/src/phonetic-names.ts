import { DISPLAY_NAMES, PHONETIC_MAP } from "./phonetic-map";

export function bengaliToEnglish(bengali: string): string | null {
	const key = bengali
		.toLowerCase()
		.replace(/[^a-z0-9\u0980-\u09FF ]/g, "")
		.trim();
	for (const [bn, en] of Object.entries(DISPLAY_NAMES)) {
		if (bn.toLowerCase().includes(key) || key.includes(bn.toLowerCase())) {
			return en;
		}
	}
	return null;
}

export function resolveBengaliToEnglish(text: string): string {
	const sorted = Object.entries(DISPLAY_NAMES).sort(
		(a, b) => b[0].length - a[0].length,
	);
	let result = text;
	for (const [bn, en] of sorted) {
		result = result.split(bn).join(en);
	}
	return result;
}

export function resolveNamesInText(text: string): string {
	const sorted = Object.entries(PHONETIC_MAP).sort(
		(a, b) => b[0].length - a[0].length,
	);
	let result = text;
	for (const [key, names] of sorted) {
		const bn = names[0];
		if (!bn) continue;
		const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const pattern = `\\b${escaped.replace(/ /g, "\\s+")}\\b`;
		result = result.replace(new RegExp(pattern, "gi"), bn);
	}
	return result;
}

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
