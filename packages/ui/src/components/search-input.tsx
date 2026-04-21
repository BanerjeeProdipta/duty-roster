"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { Mic, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

interface SearchInputProps
	extends Omit<ComponentProps<"input">, "value" | "onChange"> {
	paramKey?: string;
}

function SearchInput({
	paramKey = "q",
	className,
	placeholder,
	...props
}: SearchInputProps) {
	const searchParams = useSearchParams();
	const urlValue = searchParams.get(paramKey) ?? "";
	const [value, setValue] = useState(urlValue);

	useEffect(() => {
		setValue(searchParams.get(paramKey) ?? "");
	}, [searchParams, paramKey]);

	const handleChange = (newValue: string) => {
		setValue(newValue);
		const params = new URLSearchParams(window.location.search);
		if (newValue) {
			params.set(paramKey, newValue);
		} else {
			params.delete(paramKey);
		}
		window.history.pushState(
			null,
			"",
			params.toString() ? `?${params.toString()}` : window.location.pathname,
		);
	};

	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-xl border bg-white px-3 py-2",
				className,
			)}
		>
			<Search className="h-4 w-4 text-slate-400" />
			<input
				type="text"
				value={value}
				onChange={(e) => handleChange(e.target.value)}
				placeholder={placeholder}
				className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
				{...props}
			/>
			{value && (
				<button type="button" onClick={() => handleChange("")}>
					<X className="h-4 w-4 rounded-xl text-slate-400" />
				</button>
			)}
			<button
				type="button"
				className="rounded-md border p-1.5 hover:bg-slate-50"
			>
				<Mic className="h-4 w-4" />
			</button>
		</div>
	);
}

export { SearchInput };
