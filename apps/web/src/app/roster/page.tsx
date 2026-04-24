import { Suspense } from "react";
import { RosterPDFViewer } from "@/features/roster-preview-print";

export default function RosterPage() {
	return (
		<div className="flex flex-col gap-6">
			<Suspense fallback={<div>Loading...</div>}>
				<RosterPDFViewer />
			</Suspense>
		</div>
	);
}
