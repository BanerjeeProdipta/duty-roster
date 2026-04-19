import ShiftAllocationsClientPage from "@/components/shift-allocations/ShiftAllocationsClientPage";
import type { NurseData } from "@/components/shift-allocations/types";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export default async function ShiftAllocations() {
	const trpcServer = await getAuthedTRPCServer();
	const nursePreferences = await trpcServer.roster.getNurseShiftPreferences();

	if (!nursePreferences?.length) {
		return (
			<div className="flex h-[200px] items-center justify-center rounded-lg border border-slate-200 border-dashed text-slate-500 text-sm">
				No shift preferences found.
			</div>
		);
	}

	return (
		<ShiftAllocationsClientPage initialData={nursePreferences as NurseData[]} />
	);
}
