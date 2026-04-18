import { RosterMatrix } from "@/components/roster-table/roster-matrix";
import { getMonthDateRange } from "@/components/roster-table/roster-matrix.utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 60;

export default async function DashboardPage() {
	const trpcServer = await getAuthedTRPCServer();
	const today = new Date();
	const { startDate, endDate } = getMonthDateRange(
		today.getFullYear(),
		today.getMonth() + 1,
	);
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});

	return <RosterMatrix initialSchedules={initialSchedules} editable />;
}
