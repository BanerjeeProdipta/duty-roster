import { RosterTable } from "@/components/roster-table";
import { RosterHeader } from "@/components/roster-table/roster-header";
import { getMonthDateRange } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

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

	const nurseShiftPreferences =
		await trpcServer.roster.getNurseShiftPreferences();

	return (
		<div className="flex flex-col">
			<RosterHeader editable />

			<div className="flex flex-col rounded-2xl border">
				<RosterTable
					editable
					initialSchedules={initialSchedules}
					nurseShiftPreferences={nurseShiftPreferences}
				/>
			</div>
		</div>
	);
}
