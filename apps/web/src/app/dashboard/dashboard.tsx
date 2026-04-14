"use client";
import { RosterMatrix } from "@/components/roster-matrix";

export default function Dashboard() {
	return (
		<div className="container mx-auto py-8">
			<h1 className="mb-6 font-bold text-2xl">Dashboard</h1>
			<RosterMatrix />
		</div>
	);
}
