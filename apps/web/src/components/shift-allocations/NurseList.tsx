"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import { NurseCard } from "./NurseCard";
import type { NurseData, NurseState } from "./types";

function normalizeNurse(nurse: NurseData, totalDays: number): NurseState {
	const morning = Math.round((nurse.morning / 100) * totalDays);
	const evening = Math.round((nurse.evening / 100) * totalDays);
	const night = Math.round((nurse.night / 100) * totalDays);
	const off = Math.max(0, totalDays - morning - evening - night);
	return {
		nurseId: nurse.nurseId,
		name: nurse.name,
		morning,
		evening,
		night,
		off,
		active: nurse.active ?? true,
	};
}

interface NurseListProps {
	nurses: NurseData[];
	totalDays: number;
}

export function NurseList({ nurses, totalDays }: NurseListProps) {
	const searchParams = useSearchParams();
	const searchQuery = searchParams.get("q") ?? "";
	const originalRef = useRef<NurseState[]>([]);

	if (originalRef.current.length === 0 && nurses.length > 0) {
		originalRef.current = nurses.map((n) => normalizeNurse(n, totalDays));
	}

	const displayNurses = useMemo(() => {
		const normalized = nurses.map((n) => normalizeNurse(n, totalDays));
		return searchQuery
			? normalized.filter((n) =>
					n.name.toLowerCase().includes(searchQuery.toLowerCase()),
				)
			: normalized;
	}, [nurses, searchQuery, totalDays]);

	return (
		<div className="flex-1">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{displayNurses.length === 0 && searchQuery ? (
					<div
						key="no-results"
						className="col-span-full py-8 text-center text-slate-500"
					>
						No nurses found matching "{searchQuery}"
					</div>
				) : (
					displayNurses.map((nurse, idx) => (
						<NurseCard
							key={nurse.nurseId}
							nurse={nurse}
							totalDays={totalDays}
							original={originalRef.current[idx]}
						/>
					))
				)}
			</div>
		</div>
	);
}
