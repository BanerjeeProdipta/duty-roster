import { RosterMatrix } from "@/components/roster-matrix";
import { getWeekDateRange } from "@/components/roster-matrix.utils";
import { getTRPCServer } from "@/utils/trpc-server";

export default async function Home() {
	const { startDate, endDate } = getWeekDateRange(0);
	const trpcServer = await getTRPCServer();
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});

	return <RosterMatrix initialSchedules={initialSchedules} />;
}
