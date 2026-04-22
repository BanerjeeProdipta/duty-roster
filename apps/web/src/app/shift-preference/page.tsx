import { ShiftCounts } from "@/components/analytics/ShiftCounts";
import { MonthNavigator } from "@/components/MonthNavigator";
import ShiftAllocationsClient from "@/feature/shift-manager/ShiftAllocationsClient";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

export default async function ShiftAllocationsPage(props: {
	searchParams: Promise<{ year?: string; month?: string; days?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);
	const trpcServer = await getAuthedTRPCServer();
	const { startDate, endDate } = getMonthDateRange(year, month);
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});

	return (
		<div className="flex flex-col gap-6">
			<MonthNavigator />
			<ShiftCounts />
			<ShiftAllocationsClient initialSchedules={initialSchedules} />
		</div>
	);
}
