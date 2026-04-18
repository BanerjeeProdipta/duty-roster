import ShiftAllocationsClient from "@/components/shift-allocations/ShiftAllocationsClient";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

const ShiftAllocations = async () => {
	const trpcServer = await getAuthedTRPCServer();
	const nursePreferences = await trpcServer.roster.getNurseShiftPreferences();

	const data = Array.isArray(nursePreferences) ? nursePreferences : [];

	if (data.length === 0) {
		return <div>No preferences found</div>;
	}

	return <ShiftAllocationsClient initialData={data} />;
};

export default ShiftAllocations;
