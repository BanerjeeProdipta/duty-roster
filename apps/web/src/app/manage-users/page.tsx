import { MonthNavigator } from "@/components/MonthNavigator";
import { ShiftCounts } from "@/features/dashboard/components/ShiftCounts";
import ShiftAllocationsClient from "@/features/shift-manager/ShiftAllocationsClient";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;
export const runtime = "edge";

export default async function ShiftAllocationsPage(props: {
	searchParams: Promise<{ year?: string; month?: string; days?: string }>;
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
			<MonthNavigator />
			<ShiftCounts initialSchedules={initialSchedules} />
			<ShiftAllocationsClient initialSchedules={initialSchedules} />
		</div>
	);
}
