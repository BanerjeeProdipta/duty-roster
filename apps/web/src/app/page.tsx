import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { RosterHeader } from "@/components/roster-table/RosterHeader";
import { RosterTable } from "@/components/roster-table/RosterTable";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

export default async function Home(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);

	const { startDate, endDate } = getMonthDateRange(year, month);
	const trpcServer = await getTRPCServer();
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});

	return (
		<div className="flex flex-col gap-6">
			<RosterHeader />
			{/* <ShiftCounts month={month} year={year} /> */}
			<SearchInput placeholder="Search nurses..." className="w-full" />

			<div className="flex flex-col rounded-md">
				<RosterTable
					year={year}
					month={month}
					initialSchedules={initialSchedules}
				/>
			</div>
		</div>
	);
}
