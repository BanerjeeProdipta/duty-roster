"use client";

import { useMemo, useState } from "react";
import { getDaysInMonth } from "@/utils";
import type { NurseData } from "../components/shift-allocations/types";
import { useShiftAllocationsForm } from "./useShiftAllocationsForm";

interface UseShiftAllocationsProps {
	initialData: NurseData[];
	year?: number;
	month?: number;
}

export function useShiftAllocations({
	initialData,
	year: providedYear,
	month: providedMonth,
}: UseShiftAllocationsProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const now = new Date();
	const year = providedYear ?? now.getFullYear();
	const month = providedMonth ?? now.getMonth() + 1;
	const totalDays = getDaysInMonth(new Date(year, month - 1));

	const filteredData = useMemo(() => {
		if (!searchQuery.trim()) return initialData;
		const q = searchQuery.toLowerCase();
		return initialData.filter((n) => n.name.toLowerCase().includes(q));
	}, [initialData, searchQuery]);

	const { form } = useShiftAllocationsForm({
		initialData,
		totalDays,
		filteredData,
	});

	return {
		searchQuery,
		setSearchQuery,
		year,
		month,
		totalDays,
		filteredData,
		form,
	};
}
