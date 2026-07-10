import { PHONETIC_MAP } from "./phonetic-map";
import type { NameMatch, NameRecord } from "./types";

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

function tokenOverlapScore(
	inputTokens: string[],
	knownTokens: string[],
): number {
	let overlap = 0;
	for (const iw of inputTokens) {
		for (const kw of knownTokens) {
			if (kw.includes(iw) || iw.includes(kw)) {
				overlap +=
					Math.min(iw.length, kw.length) / Math.max(iw.length, kw.length);
			}
		}
	}
	return Math.min(
		overlap / Math.max(inputTokens.length, knownTokens.length),
		0.8,
	);
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

function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9 ]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function buildNameCandidates(nurses: NameRecord[]): string[][] {
	const candidates: string[][] = [];

	const seen = new Set<string>();

	for (const nurse of nurses) {
		const key = `__self__::${nurse.id}`;
		if (!seen.has(key)) {
			candidates.push([nurse.name, nurse.name, nurse.id]);
			seen.add(key);
		}
	}

	for (const [alias, bengaliNames] of Object.entries(PHONETIC_MAP)) {
		for (const bengaliName of bengaliNames) {
			for (const nurse of nurses) {
				if (nurse.name.includes(bengaliName)) {
					const key = `${alias}::${nurse.id}`;
					if (!seen.has(key)) {
						candidates.push([alias, nurse.name, nurse.id]);
						seen.add(key);
					}
				}
			}
		}
	}

	return candidates;
}

function scoreExact(input: string, candidates: string[][]): NameMatch | null {
	const key = normalize(input);
	if (!key) return null;

	for (const c of candidates) {
		const alias = c[0];
		if (alias && normalize(alias) === key) {
			return { bengaliName: c[1] ?? "", nurseId: c[2] ?? "", confidence: 1 };
		}
	}
	return null;
}

function scoreSubstring(
	input: string,
	candidates: string[][],
): NameMatch | null {
	const key = normalize(input);
	if (!key || key.length < 2) return null;

	const results: Array<{ idx: number; score: number }> = [];
	for (let i = 0; i < candidates.length; i++) {
		const c = candidates[i];
		if (!c) continue;
		const alias = normalize(c[0] ?? "");
		if (!alias) continue;
		if (alias.includes(key) || key.includes(alias)) {
			const score =
				Math.min(alias.length, key.length) / Math.max(alias.length, key.length);
			results.push({ idx: i, score });
		}
	}
	if (results.length === 0) return null;

	results.sort((a, b) => b.score - a.score);
	const best = results[0]!;
	const match = candidates[best.idx];
	if (!match) return null;
	return {
		bengaliName: match[1] ?? "",
		nurseId: match[2] ?? "",
		confidence: best.score * 0.85,
	};
}

function scoreCharacterOverlap(
	input: string,
	nurses: NameRecord[],
): NameMatch | null {
	const key = normalize(input);
	if (!key || key.length < 2) return null;

	let best: NameMatch | null = null;
	for (const nurse of nurses) {
		const name = normalize(nurse.name);
		let overlap = 0;
		for (const ch of key) {
			if (name.includes(ch)) overlap++;
		}
		const score =
			key.length <= name.length ? overlap / name.length : overlap / key.length;
		if (score > 0.5 && (!best || score > best.confidence)) {
			best = {
				bengaliName: nurse.name,
				nurseId: nurse.id,
				confidence: score * 0.6,
			};
		}
	}
	return best;
}

function scoreFuzzy(
	input: string,
	candidates: string[][],
	nurses: NameRecord[],
): NameMatch | null {
	const key = normalize(input);
	if (!key || key.length < 2) return null;

	const results: Array<{ idx: number; score: number }> = [];
	for (let i = 0; i < candidates.length; i++) {
		const c = candidates[i];
		if (!c) continue;
		const alias = normalize(c[0] ?? "");
		if (!alias) continue;
		const score = computeScore(key, alias);
		if (score > 0.4) {
			results.push({ idx: i, score });
		}
	}

	for (let i = 0; i < nurses.length; i++) {
		const name = nurses[i]?.name;
		if (!name) continue;
		const score = computeScore(key, normalize(name));
		if (score > 0.5) {
			const existing = results.find(
				(r) => candidates[r.idx]?.[2] === nurses[i]?.id,
			);
			if (existing) {
				if (score > existing.score) existing.score = score;
			} else {
				results.push({ idx: -1, score });
			}
		}
	}

	if (results.length === 0) return null;

	results.sort((a, b) => b.score - a.score);
	const best = results[0]!;
	if (best.idx >= 0) {
		const match = candidates[best.idx];
		if (!match) return null;
		return {
			bengaliName: match[1] ?? "",
			nurseId: match[2] ?? "",
			confidence: best.score * 0.8,
		};
	}

	const byName = results.filter((r) => r.idx < 0);
	if (byName.length > 0) {
		const bestByName = byName[0]!;
		const nurse = nurses.find((n) => normalize(n.name) === key) ?? null;
		if (nurse) {
			return {
				bengaliName: nurse.name,
				nurseId: nurse.id,
				confidence: bestByName.score * 0.7,
			};
		}
	}

	return null;
}

export function matchName(
	input: string,
	nurses: NameRecord[],
): NameMatch | null {
	if (!input || input.length === 0) return null;

	const candidates = buildNameCandidates(nurses);

	const exact = scoreExact(input, candidates);
	if (exact) return exact;

	const substring = scoreSubstring(input, candidates);
	if (substring && substring.confidence > 0.6) return substring;

	const overlap = scoreCharacterOverlap(input, nurses);
	if (overlap) return overlap;

	const fuzzy = scoreFuzzy(input, candidates, nurses);
	if (fuzzy) return fuzzy;

	return null;
}
