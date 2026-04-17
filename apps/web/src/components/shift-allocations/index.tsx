import React from "react";
import { getTRPCServer } from "@/utils/trpc-server";
import ShiftAllocationsClient from "./ShiftAllocationsClient";

const ShiftAllocations = async () => {
	const trpcServer = await getTRPCServer();
	const nursePreferences = await trpcServer.roster.getNurseShiftPreferences();

	console.log(nursePreferences);

	const data = Array.isArray(nursePreferences) ? nursePreferences : [];

	if (data.length === 0) {
		return <div>No preferences found</div>;
	}

	return (
		<div>
			<ShiftAllocationsClient initialData={data} />
		</div>
	);
};

export default ShiftAllocations;
