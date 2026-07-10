import { DISPLAY_NAMES, PHONETIC_MAP } from "./phonetic-map";

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[] = new Array(n + 1);
	for (let j = 0; j <= n; j++) dp[j] = j;
	for (let i = 1; i <= m; i++) {
		let prev = dp[0];
		dp[0] = i;
		for (let j = 1; j <= n; j++) {
			const tmp = dp[j];
			dp[j] =
				a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j - 1], dp[j]);
			prev = tmp;
		}
	}
	return dp[n];
}

function normalizedLevenshtein(a: string, b: string): number {
	const dist = levenshtein(a, b);
	const maxLen = Math.max(a.length, b.length);
	return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

function jaccardTokens(a: string[], b: string[]): number {
	if (a.length === 0 && b.length === 0) return 1;
	const setA = new Set(a);
	const setB = new Set(b);
	let intersection = 0;
	for (const t of setA) {
		if (setB.has(t)) intersection++;
	}
	const union = new Set([...setA, ...setB]).size;
	return union === 0 ? 0 : intersection / union;
}

function tokenOverlapScore(input: string[], known: string[]): number {
	const jaccard = jaccardTokens(input, known);
	if (jaccard > 0) return jaccard;

	let overlap = 0;
	for (const iw of input) {
		for (const kw of known) {
			if (kw.includes(iw) || iw.includes(kw)) {
				overlap +=
					Math.min(iw.length, kw.length) / Math.max(iw.length, kw.length);
			}
		}
	}
	return Math.min(overlap / Math.max(input.length, known.length), 0.8);
}

interface ScoredMatch {
	name: string;
	score: number;
}

function computeScore(input: string, known: string): number {
	const a = input.toLowerCase().trim().normalize("NFC");
	const b = known.toLowerCase().trim().normalize("NFC");
	if (a === b) return 1;
	if (a.length === 0 || b.length === 0) return 0;

	const aTokens = a.split(/\s+/);
	const bTokens = b.split(/\s+/);

	if (a.includes(b) || b.includes(a)) {
		const lenRatio =
			Math.min(a.length, b.length) / Math.max(a.length, b.length);
		return 0.85 + 0.1 * lenRatio;
	}

	for (let i = 0; i < aTokens.length; i++) {
		for (let j = 0; j < bTokens.length; j++) {
			if (aTokens[i] === bTokens[j]) {
				return (
					0.75 +
					0.1 *
						(Math.min(aTokens[i].length, bTokens[j].length) /
							Math.max(aTokens[i].length, bTokens[j].length))
				);
			}
		}
	}

	const tokenScore = tokenOverlapScore(aTokens, bTokens);
	if (tokenScore > 0.3) return tokenScore;

	const levScore = normalizedLevenshtein(a, b);
	if (levScore > 0.6) return levScore * 0.85;

	for (const at of aTokens) {
		for (const bt of bTokens) {
			const tokenLev = normalizedLevenshtein(at, bt);
			if (tokenLev > 0.65) {
				return tokenLev * 0.75;
			}
		}
	}

	return 0;
}

export function bengaliToEnglish(bengali: string): string | null {
	const key = bengali
		.toLowerCase()
		.replace(/[^a-z0-9\u0980-\u09FF ]/g, "")
		.trim();

	let best: ScoredMatch | null = null;
	for (const [bn, en] of Object.entries(DISPLAY_NAMES)) {
		const score = computeScore(key, bn.toLowerCase());
		if (score > 0.5 && (!best || score > best.score)) {
			best = { name: en, score };
		}
	}
	return best?.name ?? null;
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

const BENGALI_NAMES: string[] = (() => {
	const set = new Set<string>();
	for (const names of Object.values(PHONETIC_MAP)) {
		for (const bn of names) {
			if (bn) set.add(bn.toLowerCase());
		}
	}
	return [...set].sort((a, b) => b.length - a.length);
})();

const KEY_TO_BENGALI: Record<string, string> = {};
for (const [key, names] of Object.entries(PHONETIC_MAP)) {
	const first = names[0];
	if (!first) continue;
	KEY_TO_BENGALI[key.toLowerCase()] = first;
}

interface MatchEntry {
	bengali: string;
	score: number;
}

function scoreWord(word: string, bengali: string): number {
	return computeScore(word, bengali);
}

export function bestNameMatch(words: string[]): string | null {
	const all = words.join(" ").toLowerCase();

	const candidates: MatchEntry[] = [];

	for (const [key, names] of Object.entries(PHONETIC_MAP)) {
		const first = names[0];
		if (!first) continue;
		const score = computeScore(all, key);
		if (score > 0.4) {
			candidates.push({ bengali: first, score });
		}
	}

	for (const bn of BENGALI_NAMES) {
		const mapped = KEY_TO_BENGALI[bn];
		if (!mapped) continue;
		const score = computeScore(all, bn);
		if (score > 0.4) {
			candidates.push({ bengali: mapped, score });
		}
	}

	const skipPartial = new Set(["the", "on", "a", "an", "of", "to"]);
	const filtered = words.filter((w) => !skipPartial.has(w));

	for (const w of filtered) {
		for (const [key, names] of Object.entries(PHONETIC_MAP)) {
			const first = names[0];
			if (!first) continue;
			const score = computeScore(w, key);
			if (score > 0.45) {
				candidates.push({ bengali: first, score: score * 0.9 });
			}
		}
		for (const bn of BENGALI_NAMES) {
			const mapped = KEY_TO_BENGALI[bn];
			if (!mapped) continue;
			const score = computeScore(w, bn);
			if (score > 0.45) {
				candidates.push({ bengali: mapped, score: score * 0.9 });
			}
		}
	}

	for (let len = Math.min(3, words.length); len >= 2; len--) {
		for (let i = 0; i <= words.length - len; i++) {
			const phrase = words.slice(i, i + len).join(" ");
			for (const [key, names] of Object.entries(PHONETIC_MAP)) {
				const first = names[0];
				if (!first) continue;
				const score = computeScore(phrase, key);
				if (score > 0.4) {
					candidates.push({ bengali: first, score: score * 0.95 });
				}
			}
			for (const bn of BENGALI_NAMES) {
				const mapped = KEY_TO_BENGALI[bn];
				if (!mapped) continue;
				const score = computeScore(phrase, bn);
				if (score > 0.4) {
					candidates.push({ bengali: mapped, score: score * 0.95 });
				}
			}
		}
	}

	if (candidates.length === 0) return null;

	candidates.sort((a, b) => b.score - a.score);
	return candidates[0]!.bengali;
}
