"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { LayoutDashboard, Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { PUBLIC_NAV_ITEMS } from "@/lib/paths";

const UserMenu = dynamic(
	() => import("./UserMenu").then((m) => ({ default: m.UserMenu })),
	{ ssr: false },
);

export default function Header() {
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const navRef = useRef<HTMLDivElement>(null);
	const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

	useLayoutEffect(() => {
		if (!navRef.current) return;
		const activeItem =
			navRef.current.querySelector<HTMLElement>("[data-active=true]");
		if (activeItem) {
			const navRect = navRef.current.getBoundingClientRect();
			const itemRect = activeItem.getBoundingClientRect();
			setPillStyle({
				left: itemRect.left - navRect.left,
				width: itemRect.width,
			});
		}
	}, [pathname]);

	return (
		<header className="sticky top-0 z-[100] w-full border-border/50 border-b bg-white dark:bg-gray-950">
			<div className="relative mx-auto flex h-18 items-center justify-between px-4 sm:px-12 lg:px-20">
				<Link href="/" className="flex h-10 items-center gap-1">
					<LayoutDashboard className="h-6 w-6" />
					<p className="font-semibold text-xl tracking-tight">
						<span className="text-gray-900 dark:text-gray-100">simple</span>
						<span className="text-gray-500 dark:text-gray-400">roster</span>
					</p>
				</Link>

				<nav
					ref={navRef}
					className="absolute left-1/2 my-2 hidden -translate-x-1/2 items-center gap-1 rounded-full bg-gray-50 px-4 py-2 md:flex"
				>
					<div
						className="absolute inset-y-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-out"
						style={{ left: pillStyle.left, width: pillStyle.width }}
					/>
					{PUBLIC_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							href={to}
							data-active={pathname === to}
							className={cn(
								"relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-sm transition-all duration-200",
								pathname === to
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4" />
							<span>{label}</span>
						</Link>
					))}
					<UserMenu pathname={pathname} mode="links" />
				</nav>
				{/* Sign in / Sign out — at the end */}
				<UserMenu pathname={pathname} mode="auth" />
				<button
					type="button"
					className="flex h-8 w-8 items-center justify-center text-foreground md:hidden"
					onClick={() => setIsMenuOpen((v) => !v)}
					aria-label="Toggle menu"
				>
					{isMenuOpen ? (
						<X className="h-4 w-4" />
					) : (
						<Menu className="h-4 w-4" />
					)}
				</button>
			</div>

			{isMenuOpen && (
				<div className="border-border/50 border-t bg-background p-4 md:hidden">
					<div className="flex flex-col gap-1">
						{PUBLIC_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
							<Link
								key={to}
								href={to}
								onClick={() => setIsMenuOpen(false)}
								className={cn(
									"flex items-center gap-2 px-3 py-2 font-medium text-sm transition-colors",
									pathname === to ? "text-foreground" : "text-muted-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								{label}
							</Link>
						))}
						<UserMenu
							pathname={pathname}
							mobile
							onNavigate={() => setIsMenuOpen(false)}
						/>
					</div>
				</div>
			)}
		</header>
	);
}
