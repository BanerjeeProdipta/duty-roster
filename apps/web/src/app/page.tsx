import { RosterTable } from "@/components/roster-table";
import { RosterHeader } from "@/components/roster-table/roster-header";
import { getMonthDateRange } from "@/utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

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

	const nurseShiftPreferences =
		await trpcServer.roster.getNurseShiftPreferences();

	return (
		<div className="flex flex-col">
			<RosterHeader />
			<div className="flex flex-col rounded-2xl border">
				<RosterTable
					initialSchedules={initialSchedules}
					nurseShiftPreferences={nurseShiftPreferences}
				/>
			</div>
		</div>
	);
}
