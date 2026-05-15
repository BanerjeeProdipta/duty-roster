"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { LayoutDashboard, Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ROUTE_ICONS, ROUTES } from "@/lib/paths";

// Dynamic import — better-auth's client SDK (~40 kB) is NOT bundled
// into the root layout chunk. It loads as a separate chunk after hydration.
const UserMenu = dynamic(
	() => import("./UserMenu").then((m) => ({ default: m.UserMenu })),
	{
		ssr: false,
		// Placeholder matches the approximate size of the UserMenu button
		// to prevent layout shift while better-auth resolves the session.
		loading: () => (
			<div className="ml-1 h-8 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
		),
	},
);

// Static nav links that don't require auth state.
// Admin-only links (Dashboard, Manage) are rendered by UserMenu after
// the session resolves client-side, avoiding an auth-gated server render.
const NAV_LINKS = [
	{ to: ROUTES.home, label: "Home", icon: ROUTE_ICONS.home },
	{ to: ROUTES.roster, label: "Roster", icon: ROUTE_ICONS.roster },
] as const;

/**
 * Header is a Client Component only because it needs pathname for active-link
 * highlighting and mobile menu open/close state.
 * The auth-dependent UI (session, sign-out) is fully isolated in <UserMenu>
 * so better-auth's client SDK is NOT pulled into the shared layout chunk.
 */
export default function Header() {
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<header className="sticky top-0 z-[100] w-full border-border/50 border-b bg-white dark:bg-gray-950">
			<div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-12 lg:px-20">
				<Link href="/" className="flex h-10 items-center gap-2">
					<LayoutDashboard className="h-6 w-6" />
					<p className="font-semibold text-xl tracking-tight">
						<span className="text-gray-900 dark:text-gray-100">simple</span>
						<span className="text-gray-500 dark:text-gray-400">roster</span>
					</p>
				</Link>

				{/* Desktop Navigation */}
				<nav className="hidden items-center gap-1 md:flex">
					{NAV_LINKS.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							href={to}
							className={cn(
								"flex items-center gap-1.5 px-3 py-1.5 font-medium text-sm transition-colors",
								pathname === to
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4" />
							<span>{label}</span>
						</Link>
					))}
					{/* Auth-dependent links + sign-out — isolated client component */}
					<UserMenu pathname={pathname} />
				</nav>

				{/* Mobile Menu Button */}
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

			{/* Mobile Navigation */}
			{isMenuOpen && (
				<div className="border-border/50 border-t bg-background p-4 md:hidden">
					<div className="flex flex-col gap-1">
						{NAV_LINKS.map(({ to, label, icon: Icon }) => (
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
