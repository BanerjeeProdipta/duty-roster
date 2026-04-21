import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function useSearchFilter<T>(
	data: T[],
	searchFields: (item: T) => string[],
	initialQueryFromProps?: string,
) {
	const searchParams = useSearchParams();
	const urlQuery = searchParams.get("q") ?? "";
	const [searchQuery, setSearchQuery] = useState(
		initialQueryFromProps ?? urlQuery,
	);

	const handleSearch = (value: string) => {
		setSearchQuery(value);
		const params = new URLSearchParams(window.location.search);
		if (value) {
			params.set("q", value);
		} else {
			params.delete("q");
		}
		window.history.pushState(
			null,
			"",
			params.toString() ? `?${params.toString()}` : window.location.pathname,
		);
	};

	const filteredData = useMemo(() => {
		if (!searchQuery) return data;
		const q = searchQuery.toLowerCase();
		return data.filter((item) =>
			searchFields(item).some((field) => field?.toLowerCase().includes(q)),
		);
	}, [data, searchQuery, searchFields]);

	return {
		searchQuery,
		setSearchQuery: handleSearch,
		filteredData,
	};
}
