import { RosterMatrix } from "@/components/roster-matrix";

export default function DashboardPage() {
	return (
		<div className="container mx-auto max-w-9xl px-4 py-8">
			<RosterMatrix editable />
		</div>
	);
}
