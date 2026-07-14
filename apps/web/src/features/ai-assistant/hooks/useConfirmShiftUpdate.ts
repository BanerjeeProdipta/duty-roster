"use client";

import { useCallback } from "react";
import { useUpdateShift } from "@/hooks/useUpdateShift";
import { trpcClient } from "@/utils/trpc";

interface PendingConfirmation {
	nurseName: string;
	nurseId: string | null;
	englishName: string | null;
	shift: string;
	date: string;
}

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

function nameSimilarity(a: string, b: string): number {
	const left = a.toLowerCase().trim();
	const right = b.toLowerCase().trim();
	if (left === right) return 1;
	if (left.length === 0 || right.length === 0) return 0;

	const lTokens = left.split(/\s+/);
	const rTokens = right.split(/\s+/);

	if (left.includes(right) || right.includes(left)) {
		return (
			0.8 +
			0.15 *
				(Math.min(left.length, right.length) /
					Math.max(left.length, right.length))
		);
	}

	for (const lt of lTokens) {
		for (const rt of rTokens) {
			if (lt === rt) return 0.85;
		}
	}

	let overlap = 0;
	for (const lt of lTokens) {
		for (const rt of rTokens) {
			if (rt.includes(lt) || lt.includes(rt)) {
				overlap +=
					Math.min(lt.length, rt.length) / Math.max(lt.length, rt.length);
			}
		}
	}
	const tokenScore = overlap / Math.max(lTokens.length, rTokens.length);
	if (tokenScore > 0.3) return 0.5 + 0.3 * tokenScore;

	const levScore =
		1 - levenshtein(left, right) / Math.max(left.length, right.length);
	if (levScore > 0.55) return levScore * 0.75;

	return 0;
}

export function useConfirmShiftUpdate() {
	const updateShift = useUpdateShift();

	const convertDateToDateKey = useCallback((dateStr: string): string => {
		const months: Record<string, string> = {
			january: "01",
			february: "02",
			march: "03",
			april: "04",
			may: "05",
			june: "06",
			july: "07",
			august: "08",
			september: "09",
			october: "10",
			november: "11",
			december: "12",
		};
		const match = dateStr.toLowerCase().match(/(\w+)\s+(\d+)/);
		if (!match) return "";
		const month = months[match[1] ?? ""];
		const day = match[2]?.padStart(2, "0");
		const year = new Date().getFullYear();
		return `${year}-${month}-${day}`;
	}, []);

	const confirmShiftUpdate = useCallback(
		(pending: PendingConfirmation) => {
			const dateKey = convertDateToDateKey(pending.date);
			const shiftId = pending.shift === "off" ? null : `shift_${pending.shift}`;

			if (pending.nurseId) {
				trpcClient.roster.getSchedules
					.query({
						startDate: dateKey,
						endDate: dateKey,
					})
					.then((response) => {
						for (const nurseRow of response.nurseRows) {
							if (nurseRow.nurse.id === pending.nurseId) {
								const assignment = nurseRow.assignments[dateKey];
								if (assignment) {
									updateShift.mutate({
										id: assignment.id,
										shiftId,
										nurseId: pending.nurseId,
										dateKey,
									});
								}
								break;
							}
						}
					});
			} else {
				const dateKeyFallback = convertDateToDateKey(pending.date);
				trpcClient.roster.getSchedules
					.query({
						startDate: dateKeyFallback,
						endDate: dateKeyFallback,
					})
					.then((response) => {
						let bestScore = 0;
						let bestRow: (typeof response.nurseRows)[number] | null = null;
						for (const nurseRow of response.nurseRows) {
							const score = nameSimilarity(
								pending.nurseName,
								nurseRow.nurse.name,
							);
							if (score > bestScore) {
								bestScore = score;
								bestRow = nurseRow;
							}
						}
						if (bestRow && bestScore > 0.4) {
							const assignment = bestRow.assignments[dateKeyFallback];
							if (assignment) {
								updateShift.mutate({
									id: assignment.id,
									shiftId,
									nurseId: bestRow.nurse.id,
									dateKey: dateKeyFallback,
								});
							}
						}
					});
			}
		},
		[convertDateToDateKey, updateShift],
	);

	return { confirmShiftUpdate };
}
