"use client";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { trpcClient } from "@/utils/trpc";
import { useRosterData } from "../hooks/use-roster-data";
import { useRosterStore } from "../store/use-roster-store";
import { RosterHeader } from "./roster-header";
import type { SchedulesResponse } from "./roster-matrix.utils";
import { RosterTable } from "./roster-table";

export function RosterMatrix({
	editable = false,
	initialSchedules,
}: {
	editable?: boolean;
	initialSchedules?: SchedulesResponse;
}) {
	const { selectedMonth, setEditable } = useRosterStore();
	const { isLoading, summary, refetch } = useRosterData(initialSchedules);

	useEffect(() => {
		setEditable(editable);
	}, [editable, setEditable]);

	const generateMutation = useMutation({
		mutationFn: async () =>
			trpcClient.roster.generateRoster.mutate({
				year: selectedMonth.year,
				month: selectedMonth.month,
			}),
		onSuccess: async (result) => {
			await refetch();
			toast.success(`Generated ${result.schedulesCreated} schedules`);
		},
	});

	if (isLoading && !initialSchedules) return <Loader />;

	return (
		<div className="flex flex-col">
			<RosterHeader
				onGenerate={editable ? () => generateMutation.mutate() : undefined}
				isGenerating={generateMutation.isPending}
			/>

			<div className="flex flex-col rounded-2xl border">
				<RosterTable />
			</div>
		</div>
	);
}
