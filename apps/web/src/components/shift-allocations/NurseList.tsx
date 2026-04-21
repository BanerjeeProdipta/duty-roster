"use client";

import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { NurseCard } from "./NurseCard";
import type { NurseState } from "./types";
import {
	convertToPreferences,
	useUpdateNurseActive,
	useUpdatePreferences,
} from "./useUpdatePreferences";

interface NurseListProps {
	form: any;
	totalDays: number;
	highlightName?: string;
}

export function NurseList({
	form,
	totalDays,
	highlightName = "",
}: NurseListProps) {
	const searchParams = useSearchParams();
	const searchQuery = searchParams.get("q") ?? "";

	const updateMutation = useUpdatePreferences();
	const activeUpdateMutation = useUpdateNurseActive();
	const originalRef = useRef<NurseState[]>([]);
	const updatingNurseIdRef = useRef<string | null>(null);

	const nurses = form.useStore((state: any) => state.values.nurses ?? []);

	if (originalRef.current.length === 0 && nurses.length > 0) {
		originalRef.current = nurses;
	}

	const displayNurses = searchQuery
		? nurses.filter((n: any) =>
				n.name.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: nurses;

	return (
		<div className="flex-1">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{displayNurses.length === 0 && searchQuery ? (
					<div className="col-span-full py-8 text-center text-slate-500">
						No nurses found matching "{searchQuery}"
					</div>
				) : (
					displayNurses.map((nurse: any, _i: any) => {
						const originalIndex = nurses.findIndex(
							(n: any) => n.id === nurse.id,
						);
						return (
							<NurseCard
								key={nurse.id}
								nurse={nurse}
								totalDays={totalDays}
								original={originalRef.current[originalIndex]}
								highlight={highlightName === nurse.name}
								onFieldChange={(subField, val) => {
									console.log(`Setting ${subField} to ${val}`);
								}}
								onActiveChange={(active) => {
									console.log(`Setting active to ${active}`);
								}}
								onActiveUpdate={async (active) => {
									updatingNurseIdRef.current = nurse.id;
									await activeUpdateMutation.mutateAsync({
										nurseId: nurse.id,
										active,
										morning: nurse.morning,
										evening: nurse.evening,
										night: nurse.night,
										totalDays,
									});
									const idx = originalRef.current.findIndex(
										(n) => n.id === nurse.id,
									);
									if (idx !== -1) {
										originalRef.current[idx] = { ...nurse, active };
									}
								}}
								isActiveLoading={
									activeUpdateMutation.isPending &&
									updatingNurseIdRef.current === nurse.id
								}
								onUpdate={async () => {
									const preferences = convertToPreferences(
										{
											id: nurse.id,
											morning: nurse.morning,
											evening: nurse.evening,
											night: nurse.night,
											active: nurse.active,
										},
										totalDays,
									);
									await updateMutation.mutateAsync({
										preferences,
										daysInMonth: totalDays,
									});
									const idx = originalRef.current.findIndex(
										(n) => n.id === nurse.id,
									);
									if (idx !== -1) {
										originalRef.current[idx] = { ...nurse };
									}
								}}
								errors={[]}
								index={originalIndex}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}
