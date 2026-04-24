import { ShiftCounts } from "@/features/dashboard/components/ShiftCounts";
import { RosterHeader } from "@/features/dashboard/roster-table/RosterHeader";
import { RosterTable } from "@/features/dashboard/roster-table/RosterTable";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

export default async function DashboardPage(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
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
			<RosterHeader editable initialSchedules={initialSchedules} />
			<ShiftCounts initialSchedules={initialSchedules} />
			<RosterTable editable initialSchedules={initialSchedules} />
		</div>
	);
}
