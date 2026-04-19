"use client";

import { Search, X } from "lucide-react";
import { useSearchFilter } from "@/hooks/useSearchFilter";
import ShiftAllocationsClient from "./ShiftAllocationsClient";
import type { NurseData } from "./types";

export default function ShiftAllocationsClientPage({
	initialData,
}: {
	initialData: NurseData[];
}) {
	const {
		searchQuery: q,
		setSearchQuery: handleSearch,
		filteredData,
	} = useSearchFilter(initialData, (n) => [n.name]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
				<Search className="h-4 w-4 text-slate-400" />
				<input
					type="text"
					placeholder="Search by name..."
					value={q}
					onChange={(e) => handleSearch(e.target.value)}
					className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
				/>
				{q && (
					<button type="button" onClick={() => handleSearch("")}>
						<X className="h-4 w-4 text-slate-400" />
					</button>
				)}
			</div>
			<ShiftAllocationsClient initialData={filteredData} />
		</div>
	);
}
