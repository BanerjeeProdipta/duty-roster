import { RosterMatrix } from "@/components/roster-matrix";
import { getMonthDateRange } from "@/components/roster-matrix.utils";
import ShiftAllocations from "@/components/shift-allocations";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 60;

export default async function DashboardPage() {
	//   const today = new Date();
	//   const { startDate, endDate } = getMonthDateRange(
	//     today.getFullYear(),
	//     today.getMonth() + 1,
	//   );
	//   const initialSchedules = await trpcServer.roster.getSchedules({
	//     startDate,
	//     endDate,
	//   });

	return (
		<>
			<ShiftAllocations />
		</>
	);
}
