import { RosterMatrix } from "@/components/roster-matrix";
import { getWeekDateRange } from "@/components/roster-matrix.utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 60;

export default async function DashboardPage() {
	const { startDate, endDate } = getWeekDateRange(0);
	const trpcServer = await getTRPCServer();
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});
	console.log({ initialSchedules });
	return <RosterMatrix editable initialSchedules={initialSchedules} />;
}
