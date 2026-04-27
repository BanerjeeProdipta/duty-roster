import { Suspense } from "react";
import { RosterPDFViewer } from "@/features/roster-preview-print";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;
export const runtime = "edge";

export default async function RosterPage(props: {
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
			<Suspense fallback={<div>Loading...</div>}>
				<RosterPDFViewer initialSchedules={initialSchedules} />
			</Suspense>
		</div>
	);
}
