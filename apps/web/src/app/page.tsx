import { RosterTable } from "@/components/roster-table";
import { RosterHeader } from "@/components/roster-table/roster-header";
import { getMonthDateRange } from "@/utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

export default async function Home(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const searchParams = await props.searchParams;
	const today = new Date();
	const year = searchParams.year
		? Number.parseInt(searchParams.year, 10)
		: today.getFullYear();
	const month = searchParams.month
		? Number.parseInt(searchParams.month, 10)
		: today.getMonth() + 1;

	const { startDate, endDate } = getMonthDateRange(year, month);
	const trpcServer = await getTRPCServer();
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});

	return (
		<div className="flex flex-col">
			<RosterHeader />
			<div className="flex flex-col rounded-2xl border">
				<RosterTable initialSchedules={initialSchedules} />
			</div>
		</div>
	);
}
