import { Suspense } from "react";
import { RosterPDFViewer } from "@/features/dashboard/components/RosterViewer";

export default function RosterPage() {
	return (
		<div className="flex flex-col gap-6">
			<Suspense fallback={<div>Loading...</div>}>
				<RosterPDFViewer />
			</Suspense>
		</div>
	);
}
