import { RosterMatrix } from "@/components/roster-matrix";
import { getMonthDateRange } from "@/components/roster-matrix.utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 60;

export default async function Home() {
	const today = new Date();
	const { startDate, endDate } = getMonthDateRange(
		today.getFullYear(),
		today.getMonth() + 1,
	);
	const trpcServer = await getTRPCServer();
	const initialSchedules = await trpcServer.roster.getSchedules({
		startDate,
		endDate,
	});

	const _monthName = today.toLocaleString("default", { month: "long" });

	return <RosterMatrix initialSchedules={initialSchedules} />;
}
