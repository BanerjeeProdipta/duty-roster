"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

interface DialogContextValue {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialog() {
	const ctx = useContext(DialogContext);
	if (!ctx) throw new Error("Dialog components must be used within <Dialog>");
	return ctx;
}

function Dialog({
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	children,
}: {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : uncontrolledOpen;

	const setOpen = useCallback(
		(value: boolean) => {
			if (!isControlled) setUncontrolledOpen(value);
			controlledOnOpenChange?.(value);
		},
		[isControlled, controlledOnOpenChange],
	);

	return (
		<DialogContext.Provider value={{ open, onOpenChange: setOpen }}>
			{children}
		</DialogContext.Provider>
	);
}

function DialogTrigger({
	asChild,
	children,
	...props
}: {
	asChild?: boolean;
	children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const { onOpenChange } = useDialog();
	if (asChild) {
		return (
			<button type="button" onClick={() => onOpenChange(true)}>
				{children}
			</button>
		);
	}
	return (
		<button type="button" onClick={() => onOpenChange(true)} {...props}>
			{children}
		</button>
	);
}

function DialogContent({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	const { open, onOpenChange } = useDialog();

	if (!open) return null;

	return createPortal(
		// biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay click-to-close
		<div
			role="presentation"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
			onClick={() => onOpenChange(false)}
			onKeyDown={(e) => {
				if (e.key === "Escape") onOpenChange(false);
			}}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only, no action */}
			<div
				role="dialog"
				data-slot="dialog-content"
				onClick={(e) => e.stopPropagation()}
				className={cn(
					"relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900",
					className,
				)}
				{...props}
			>
				<button
					type="button"
					onClick={() => onOpenChange(false)}
					className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
				>
					<XIcon className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</button>
				{children}
			</div>
		</div>,
		document.body,
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("mb-4 flex flex-col gap-1.5", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("mt-6 flex justify-end gap-3", className)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
	return (
		<h2
			data-slot="dialog-title"
			className={cn(
				"font-bold text-gray-900 text-lg dark:text-gray-100",
				className,
			)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="dialog-description"
			className={cn("text-gray-600 text-sm dark:text-gray-400", className)}
			{...props}
		/>
	);
}

function DialogClose({
	children,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const { onOpenChange } = useDialog();
	return (
		<button type="button" onClick={() => onOpenChange(false)} {...props}>
			{children}
		</button>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
};
