"use client";

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
	onChange,
}: {
	value: Value;
	onChange: (v: Value) => void;
}) {
	const ref = useRef<HTMLDivElement | null>(null);
	const activeRef = useRef<Active | null>(null);

	const total = 100;

	const A = value.morning;
	const B = value.morning + value.evening;
	const C = value.morning + value.evening + value.night;

	function getX(clientX: number) {
		if (!ref.current) return 0;
		const r = ref.current.getBoundingClientRect();
		return ((clientX - r.left) / r.width) * total;
	}

	function setFromBounds(a: number, b: number, c: number) {
		const morning = Math.round(a);
		const evening = Math.round(b - a);
		const night = Math.round(c - b);

		const used = morning + evening + night;
		const off = total - used;

		onChange({
			morning,
			evening,
			night,
			off,
		});
	}

	function startDrag(mode: Active) {
		activeRef.current = mode;

		const move = (e: PointerEvent) => {
			const x = Math.round(getX(e.clientX));

			if (activeRef.current === "a") {
				const newA = Math.max(0, Math.min(x, B));
				setFromBounds(newA, B, C);
			}

			if (activeRef.current === "b") {
				const newB = Math.max(A, Math.min(x, C));
				setFromBounds(A, newB, C);
			}

			if (activeRef.current === "c") {
				const newC = Math.max(B, Math.min(x, total));
				setFromBounds(A, B, newC);
			}
		};

		const up = () => {
			activeRef.current = null;
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
		};

		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}

	return (
		<div
			ref={ref}
			className="relative h-4 overflow-hidden rounded-full bg-gray-100 shadow-sm"
		>
			{/* morning */}
			<Segment left={0} width={A} color="#FDE68A" label={value.morning} />

			{/* evening */}
			<Segment
				left={A}
				width={value.evening}
				color="#BFDBFE"
				label={value.evening}
			/>

			{/* night */}
			<Segment
				left={B}
				width={value.night}
				color="#C4B5FD"
				label={value.night}
			/>

			{/* off */}
			<Segment left={C} width={value.off} color="#E5E7EB" label={value.off} />

			{/* handles */}
			<Handle left={A} color="#111827" onDown={() => startDrag("a")} />
			<Handle left={B} color="#111827" onDown={() => startDrag("b")} />
			<Handle left={C} color="#111827" onDown={() => startDrag("c")} />
		</div>
	);
}

function Segment({
	left,
	width,
	color,
	_label,
}: {
	left: number;
	width: number;
	color: string;
	label: number;
}) {
	if (width <= 0) return null;

	return (
		<div
			className="absolute flex h-4 items-center justify-center font-medium text-gray-800 text-xs"
			style={{
				left: `${left}%`,
				width: `${width}%`,
				backgroundColor: color,
			}}
		/>
	);
}

function Handle({
	left,
	_color,
	onDown,
}: {
	left: number;
	color: string;
	onDown: () => void;
}) {
	return (
		<div
			onPointerDown={(e) => {
				e.preventDefault();
				(e.target as HTMLElement).setPointerCapture(e.pointerId);
				onDown();
			}}
			className="absolute top-1/2 z-10 h-4 w-4 cursor-grab rounded-full border-3 border-white bg-slate-400 shadow"
			style={{
				left: `${left}%`,
				transform: "translate(-50%, -50%)",
			}}
		/>
	);
}
