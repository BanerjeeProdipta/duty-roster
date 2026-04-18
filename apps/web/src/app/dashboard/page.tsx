import { RosterTable } from "@/components/roster-table";
import { RosterHeader } from "@/components/roster-table/roster-header";
import { getMonthDateRange } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

export default async function DashboardPage(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const searchParams = await props.searchParams;
	const trpcServer = await getAuthedTRPCServer();
	const today = new Date();
	const year = searchParams.year
		? Number.parseInt(searchParams.year, 10)
		: today.getFullYear();
	const month = searchParams.month
		? Number.parseInt(searchParams.month, 10)
		: today.getMonth() + 1;

	const { startDate, endDate } = getMonthDateRange(year, month);
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});

	return (
		<div className="flex flex-col">
			<RosterHeader editable />

			<div className="flex flex-col rounded-2xl border">
				<RosterTable editable initialSchedules={initialSchedules} />
			</div>
		</div>
	);
}
