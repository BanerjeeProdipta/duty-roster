"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
	children: React.ReactNode;
}

function Table({ className, children, ...props }: TableProps) {
	return (
		<div className="relative w-full overflow-auto">
			<table
				className={cn("w-full caption-bottom text-sm", className)}
				{...props}
			>
				{children}
			</table>
		</div>
	);
}

interface TableHeaderProps
	extends React.HTMLAttributes<HTMLTableSectionElement> {
	children: React.ReactNode;
}

function TableHeader({ className, children, ...props }: TableHeaderProps) {
	return (
		<thead className={cn("[&_tr]:border-b", className)} {...props}>
			{children}
		</thead>
	);
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
	children: React.ReactNode;
}

function TableBody({ className, children, ...props }: TableBodyProps) {
	return (
		<tbody className={cn("[&_tr:last-child]:border-0", className)} {...props}>
			{children}
		</tbody>
	);
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
	children: React.ReactNode;
}

function TableRow({ className, children, ...props }: TableRowProps) {
	return (
		<tr
			className={cn(
				"border-b transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-slate-50",
				className,
			)}
			{...props}
		>
			{children}
		</tr>
	);
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
	children: React.ReactNode;
}

function TableHead({ className, children, ...props }: TableHeadProps) {
	return (
		<th
			className={cn(
				"h-10 px-2 text-left align-middle font-medium text-slate-500 text-xs uppercase tracking-wider [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className,
			)}
			{...props}
		>
			{children}
		</th>
	);
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
	children: React.ReactNode;
}

function TableCell({ className, children, ...props }: TableCellProps) {
	return (
		<td
			className={cn(
				"p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
				className,
			)}
			{...props}
		>
			{children}
		</td>
	);
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
