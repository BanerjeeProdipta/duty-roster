import { cn } from "@Duty-Roster/ui/lib/utils";

interface PaginationProps {
	page: number;
	pageSize: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function Pagination({
	page,
	pageSize,
	totalPages,
	onPageChange,
	onPageSizeChange,
	className,
}: PaginationProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between px-4 py-2 text-gray-600 text-sm",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				<label htmlFor="page-size" className="text-gray-500">
					Rows per page:
				</label>
				<select
					id="page-size"
					value={pageSize}
					onChange={(e) => onPageSizeChange(Number(e.target.value))}
					className="rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
				>
					{PAGE_SIZE_OPTIONS.map((size) => (
						<option key={size} value={size}>
							{size}
						</option>
					))}
				</select>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
					className="rounded-md px-2 py-1 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
				>
					← Prev
				</button>
				<span className="tabular-nums">
					Page {page} of {totalPages}
				</span>
				<button
					type="button"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
					className="rounded-md px-2 py-1 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Next →
				</button>
			</div>
		</div>
	);
}
