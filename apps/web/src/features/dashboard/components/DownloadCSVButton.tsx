"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getMonthDateRange } from "@/utils";
import { trpcClient } from "@/utils/trpc";

export function DownloadCSVButton() {
	const searchParams = useSearchParams();
	const [isDownloading, setIsDownloading] = useState(false);

	const yearParam = searchParams.get("year");
	const monthParam = searchParams.get("month");

	const now = new Date();
	const year = yearParam ? Number.parseInt(yearParam, 10) : now.getFullYear();
	const month = monthParam
		? Number.parseInt(monthParam, 10)
		: now.getMonth() + 1;

	const { startDate, endDate } = getMonthDateRange(year, month);

	const handleDownload = async () => {
		if (isDownloading) return;

		setIsDownloading(true);
		try {
			const xlsxBase64 = await trpcClient.roster.downloadCSV.query({
				startDate,
				endDate,
			});

			const binaryString = atob(xlsxBase64);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			const blob = new Blob([bytes], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `roster-${year}-${String(month).padStart(2, "0")}.xlsx`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleDownload}
			disabled={isDownloading}
			className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 font-medium text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Download
				className={`h-4 w-4 ${isDownloading ? "animate-bounce" : ""}`}
			/>
			{isDownloading ? "Downloading..." : "Download Excel"}
		</button>
	);
}
