import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { RosterHeader } from "@/features/dashboard/components/roster-table/RosterHeader";
import { RosterTable } from "@/features/dashboard/components/roster-table/RosterTable";
import { ShiftCounts } from "@/features/dashboard/components/ShiftCounts";
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

	console.log(initialSchedules);

	return (
		<div className="flex flex-col gap-6">
			<RosterHeader editable />
			<ShiftCounts />
			<SearchInput placeholder="Search nurses..." className="w-full" />
			<RosterTable editable initialSchedules={initialSchedules} />
		</div>
	);
}
