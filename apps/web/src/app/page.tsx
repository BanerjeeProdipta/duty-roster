"use client";

import { RosterMatrix } from "@/components/roster-matrix";

export default function Home() {
	return (
		<div className="container mx-auto max-w-9xl px-4 py-8">
			<div className="mb-8">
				<h1 className="mb-2 font-bold text-3xl">Duty Roster</h1>
				<p className="text-muted-foreground">Weekly shift schedule</p>
			</div>
			<RosterMatrix />
		</div>
	);
}
