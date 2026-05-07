import { Suspense, lazy } from "react";
import { RosterPrintSkeleton } from "@/features/roster-preview-print/components/RosterPrintSkeleton";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

const RosterPDFViewer = lazy(() =>
	import("@/features/roster-preview-print").then((mod) => ({
		default: mod.RosterPDFViewer,
	})),
);

export const revalidate = 60;

export async function generateStaticParams() {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	return [
		{ year: String(currentYear), month: String(currentMonth) },
		{ year: String(currentYear), month: String(currentMonth === 1 ? 12 : currentMonth - 1) },
	];
}

async function RosterContent(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);

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
