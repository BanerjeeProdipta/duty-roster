import { lazy, Suspense } from "react";
import { RosterPrintSkeleton } from "@/features/roster-preview-print/components/RosterPrintSkeleton";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const runtime = "edge";

const RosterPDFViewer = lazy(() =>
	import("@/features/roster-preview-print").then((mod) => ({
		default: mod.RosterPDFViewer,
	})),
);

export const revalidate = 60;

async function RosterContent(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);

	try {
		const trpcServer = await getAuthedTRPCServer();
		const { startDate, endDate } = getMonthDateRange(year, month);
		const initialSchedules = await trpcServer.roster.getSchedules.query({
			startDate,
			endDate,
		});

		return (
			<div className="flex flex-col gap-6">
				<Suspense fallback={<RosterPrintSkeleton />}>
					<RosterPDFViewer initialSchedules={initialSchedules} />
				</Suspense>
			</div>
		);
	} catch (e) {
		console.error("Failed to load roster print preview:", e);
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<p className="font-medium text-gray-800 text-lg">
					Unable to load the roster preview.
				</p>
				<p className="text-gray-600 text-sm">Please try again later.</p>
			</div>
		);
	}
}

export default function RosterPage(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	return (
		<Suspense fallback={<RosterPrintSkeleton />}>
			<RosterContent searchParams={props.searchParams} />
		</Suspense>
	);
}
