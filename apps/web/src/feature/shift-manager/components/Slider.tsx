"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { useRef } from "react";

type Value = {
	morning: number;
	evening: number;
	night: number;
	off: number;
};

type Active = "a" | "b" | "c";

export function FourWaySlider({
	value,
	total = 100,
	onChange,
	disabled,
}: {
	value: Value;
	total?: number;
	onChange: (v: Value) => void;
	disabled?: boolean;
}) {
	const ref = useRef<HTMLDivElement | null>(null);

	const A = value.morning;
	const B = value.morning + value.evening;
	const C = value.morning + value.evening + value.night;

	// Use refs to avoid stale closures in window event listeners
	const valueRef = useRef({ A, B, C, total, onChange });
	valueRef.current = { A, B, C, total, onChange };

	function startDrag(mode: Active) {
		if (disabled) return;
		const move = (e: PointerEvent) => {
			if (!ref.current) return;
			const r = ref.current.getBoundingClientRect();
			const x = Math.round(
				((e.clientX - r.left) / r.width) * valueRef.current.total,
			);

			const {
				A: curA,
				B: curB,
				C: curC,
				total: curTotal,
				onChange: curOnChange,
			} = valueRef.current;

			let nextA = curA;
			let nextB = curB;
			let nextC = curC;

			if (mode === "a") nextA = Math.max(0, Math.min(x, curB));
			if (mode === "b") nextB = Math.max(curA, Math.min(x, curC));
			if (mode === "c") nextC = Math.max(curB, Math.min(x, curTotal));

			curOnChange({
				morning: nextA,
				evening: nextB - nextA,
				night: nextC - nextB,
				off: curTotal - nextC,
			});
		};

		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
		};

		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}

	const pct = (val: number) =>
		total > 0 ? Math.min(100, Math.max(0, (val / total) * 100)) : 0;

	return (
		<div
			ref={ref}
			className="relative h-2 w-full overflow-hidden rounded-full bg-slate-50"
		>
			{/* Segments */}
			<div
				className="absolute h-full bg-[#FDE68A]"
				style={{ left: 0, width: `${pct(A)}%` }}
			/>
			<div
				className="absolute h-full bg-[#BFDBFE]"
				style={{ left: `${pct(A)}%`, width: `${pct(B - A)}%` }}
			/>
			<div
				className="absolute h-full bg-[#C4B5FD]"
				style={{ left: `${pct(B)}%`, width: `${pct(C - B)}%` }}
			/>
			<div
				className="absolute h-full bg-slate-200"
				style={{ left: `${pct(C)}%`, width: `${pct(total - C)}%` }}
			/>

			{/* Handles */}
			<Handle pos={pct(A)} onDown={() => startDrag("a")} disabled={disabled} />
			<Handle pos={pct(B)} onDown={() => startDrag("b")} disabled={disabled} />
			<Handle pos={pct(C)} onDown={() => startDrag("c")} disabled={disabled} />
		</div>
	);
}

function Handle({
	pos,
	onDown,
	disabled,
}: {
	pos: number;
	onDown: () => void;
	disabled?: boolean;
}) {
	return (
		<div
			onPointerDown={(e) => {
				e.preventDefault();
				(e.target as HTMLElement).setPointerCapture(e.pointerId);
				onDown();
			}}
			className={cn(
				"absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400",
				disabled ? "cursor-not-allowed bg-slate-300" : "cursor-grab",
			)}
			style={{ left: `${pos}%` }}
		/>
	);
}
