"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import ShiftAllocationsClient from "./ShiftAllocationsClient";
import type { NurseData } from "./types";

export default function ShiftAllocationsClientPage({
	initialData,
}: {
	initialData: NurseData[];
}) {
	const searchParams = useSearchParams();
	const q = searchParams?.get("q") ?? "";

	const filteredData = useMemo(() => {
		if (!q) return initialData;
		return initialData.filter((n) =>
			n.name.toLowerCase().includes(q.toLowerCase()),
		);
	}, [initialData, q]);

	const handleSearch = (value: string) => {
		const params = new URLSearchParams(window.location.search);
		if (value) {
			params.set("q", value);
		} else {
			params.delete("q");
		}
		window.history.pushState(
			null,
			"",
			params.toString() ? `?${params.toString()}` : "/shift-preference",
		);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
				<Search className="h-4 w-4 text-slate-400" />
				<input
					type="text"
					placeholder="Search by name..."
					defaultValue={q}
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
