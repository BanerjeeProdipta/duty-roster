import { RosterMatrix } from "@/components/roster-matrix";
import { getMonthDateRange } from "@/components/roster-matrix.utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 60;

export default async function DashboardPage() {
	const trpcServer = await getTRPCServer();
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
