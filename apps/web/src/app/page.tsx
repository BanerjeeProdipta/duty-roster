import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { RosterTable } from "@/features/dashboard/components/roster-table/RosterTable";
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

	const nurseNames =
		initialSchedules?.nurseRows.map((row) => row.nurse.name) ?? [];
	const nurseCount = nurseNames.length;

	return (
		<div className="flex flex-col gap-6">
			<SearchInput
				paramKey="q"
				language="bn-BD"
				placeholder="নার্সের নাম দিয়ে খুঁজুন..."
				suggestions={nurseNames}
				suggestionCount={nurseCount}
			/>
			<RosterTable initialSchedules={initialSchedules} />
		</div>
	);
}
