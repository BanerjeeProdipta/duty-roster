import type { NameMatch, NameRecord } from "./types";
import { PHONETIC_MAP } from "./phonetic-map";

function normalize(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function buildNameCandidates(nurses: NameRecord[]): string[][] {
	const candidates: string[][] = [];

	const added = new Set<string>();

	for (const nurse of nurses) {
		candidates.push([nurse.name, nurse.name, nurse.id]);
		added.add(nurse.id);
	}

	for (const [alias, bengaliNames] of Object.entries(PHONETIC_MAP)) {
		for (const bengaliName of bengaliNames) {
			const nurse = nurses.find((n) => n.name === bengaliName);
			if (nurse && !added.has(nurse.id)) {
				candidates.push([alias, nurse.name, nurse.id]);
				added.add(nurse.id);
			} else if (nurse) {
				candidates.push([alias, nurse.name, nurse.id]);
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

function scoreSubstring(input: string, candidates: string[][]): NameMatch | null {
	const key = normalize(input);
	if (!key || key.length < 2) return null;

	const results: Array<{ idx: number; score: number }> = [];
	for (let i = 0; i < candidates.length; i++) {
		const c = candidates[i];
		if (!c) continue;
		const alias = normalize(c[0] ?? "");
		if (!alias) continue;
		if (alias.includes(key) || key.includes(alias)) {
			const score = Math.min(alias.length, key.length) / Math.max(alias.length, key.length);
			results.push({ idx: i, score });
		}
	}
	if (results.length === 0) return null;

	results.sort((a, b) => b.score - a.score);
	const best = results[0]!;
	const match = candidates[best.idx];
	if (!match) return null;
	return { bengaliName: match[1] ?? "", nurseId: match[2] ?? "", confidence: best.score * 0.85 };
}

function scoreCharacterOverlap(input: string, nurses: NameRecord[]): NameMatch | null {
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
			key.length <= name.length
				? overlap / name.length
				: overlap / key.length;
		if (score > 0.5 && (!best || score > best.confidence)) {
			best = { bengaliName: nurse.name, nurseId: nurse.id, confidence: score * 0.6 };
		}
	}
	return best;
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

	return null;
}
