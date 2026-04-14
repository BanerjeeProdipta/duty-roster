"use client";

import { RosterMatrix } from "@/components/roster-matrix";

export default function Home() {
	return (
		<div className="w-full max-w-none px-2 py-4 sm:px-4 sm:py-6">
			<RosterMatrix />
		</div>
	);
}
