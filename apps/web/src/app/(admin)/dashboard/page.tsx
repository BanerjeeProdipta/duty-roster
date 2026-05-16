import { lazy, Suspense } from "react";
import { ShiftCountsSkeleton } from "@/features/dashboard/components/ShiftCountsSkeleton";
import { VoiceAssistantWrapper } from "@/features/dashboard/components/VoiceAssistantWrapper";
import { RosterHeader } from "@/features/dashboard/roster-table/RosterHeader";
import { RosterTableSkeleton } from "@/features/dashboard/roster-table/RosterTableSkeleton";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const runtime = "edge";

const ShiftCounts = lazy(() =>
	import("@/features/dashboard/components/ShiftCounts").then((mod) => ({
		default: mod.ShiftCounts,
	})),
);

const RosterTable = lazy(() =>
	import("@/features/dashboard/roster-table/RosterTable").then((mod) => ({
		default: mod.RosterTable,
	})),
);

export const revalidate = 60;

async function DashboardContent(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);

	const { startDate, endDate } = getMonthDateRange(year, month);
	try {
		const trpcServer = await getAuthedTRPCServer();
		const initialSchedules = await trpcServer.roster.getSchedules.query({
			startDate,
			endDate,
		});

		return (
			<div className="flex flex-col gap-6">
				<RosterHeader editable initialSchedules={initialSchedules} />
				<ShiftCounts initialSchedules={initialSchedules} />
				<RosterTable editable initialSchedules={initialSchedules} />
			</div>
		);
	} catch (e) {
		console.error("Failed to load roster on dashboard:", e);
		return (
			<div className="flex flex-col gap-6">
				<RosterHeader editable />
				<div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
					<p className="font-medium text-lg text-red-800">
						Unable to load the roster at this time.
					</p>
					<p className="mt-2 text-red-600 text-sm">
						Please try refreshing the page. If the problem persists, the server
						may be temporarily unavailable.
					</p>
				</div>
			</div>
		);
	}
}

function DashboardLoading() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-gray-200" />
				<div className="flex items-center gap-4">
					<div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200" />
					<div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
				</div>
			</div>
			<ShiftCountsSkeleton />
			<RosterTableSkeleton />
		</div>
	);
}

export default function DashboardPage(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	return (
		<Suspense fallback={<DashboardLoading />}>
			<DashboardContent searchParams={props.searchParams} />
			<VoiceAssistantWrapper />
		</Suspense>
	);
}
