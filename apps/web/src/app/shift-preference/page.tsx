import { ShiftCounts } from "@/components/analytics/ShiftCounts";
import { MonthNavigator } from "@/components/shift-allocations/MonthNavigator";
import ShiftAllocationsClient from "@/components/shift-allocations/ShiftAllocationsClient";
import { getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export default async function ShiftAllocations(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);

	const trpcServer = await getAuthedTRPCServer();
	const [nursePreferences, shiftRequirements] = await Promise.all([
		trpcServer.roster.getNurseShiftPreferences(),
		trpcServer.roster.getMonthlyShiftRequirements({ year, month }),
	]);

	if (!nursePreferences?.length) {
		return (
			<div className="flex h-[200px] items-center justify-center rounded-lg border border-slate-200 border-dashed text-slate-500 text-sm">
				No shift preferences found.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<MonthNavigator />
			<ShiftCounts month={month} year={year} />
			<ShiftAllocationsClient
				initialData={nursePreferences}
				year={year}
				month={month}
				capacity={shiftRequirements.preferenceCapacity}
			/>
		</div>
	);
}
