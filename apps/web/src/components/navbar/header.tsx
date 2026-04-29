"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_PATHS, PATHS } from "@/config/paths";
import { authClient } from "@/lib/auth-client";

const PUBLIC_LINKS = [
	{ to: PATHS.HOME, label: "Home" },
	{ to: PATHS.ROSTER, label: "Roster" },
] as const;

const ADMIN_LINKS = [
	{ to: PATHS.DASHBOARD, label: "Dashboard" },
	{ to: PATHS.MANAGE_USERS, label: "Manage" },
] as const;

export default function Header() {
	const router = useRouter();
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { data: session, isPending } = authClient.useSession();
	const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

	const links = session?.user
		? [...PUBLIC_LINKS, ...(isAdminPath ? ADMIN_LINKS : [])]
		: PUBLIC_LINKS;

	const handleSignOut = async () => {
		await authClient.signOut();
		document.cookie =
			"user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
		router.push(PATHS.HOME);
		router.refresh();
		toast.success("Signed out successfully");
	};

	return (
		<header className="sticky top-0 z-[100] w-full border-border/50 border-b bg-white backdrop-blur-md dark:bg-slate-950/80">
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
				<Link href={PATHS.HOME} className="flex h-10 w-10 items-center">
					<Image
						src="/logo.png"
						alt="logo"
						height={100}
						width={100}
						className="rounded-sm"
					/>
					<p className="font-semibold text-xl tracking-tight">
						<span className="text-slate-900 dark:text-slate-100">simple</span>
						<span className="text-slate-500 dark:text-slate-400">roster</span>
					</p>
				</Link>

				{/* Desktop Navigation */}
				<nav className="hidden items-center gap-1 md:flex">
					{links.map(({ to, label }) => {
						const isActive = pathname === to;
						return (
							<Link
								key={to}
								href={to}
								className={cn(
									"px-3 py-1.5 font-medium text-sm transition-colors",
									isActive
										? "text-foreground underline underline-offset-4"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{label}
							</Link>
						);
					})}
					{!isPending &&
						(session?.user ? (
							<Button
								variant="secondary"
								onClick={handleSignOut}
								className="ml-1"
							>
								Sign Out
							</Button>
						) : (
							<Button
								variant="secondary"
								onClick={() => router.push(PATHS.AUTH)}
								className="ml-1"
							>
								Sign In
							</Button>
						))}
				</nav>

				{/* Mobile Menu Button */}
				<button
					type="button"
					className="flex h-8 w-8 items-center justify-center text-foreground md:hidden"
					onClick={() => setIsMenuOpen(!isMenuOpen)}
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
						{links.map(({ to, label }) => {
							const isActive = pathname === to;
							return (
								<Link
									key={to}
									href={to}
									onClick={() => setIsMenuOpen(false)}
									className={cn(
										"px-3 py-2 font-medium text-sm transition-colors",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
								>
									{label}
								</Link>
							);
						})}
						{!isPending &&
							(session?.user ? (
								<Button
									variant="ghost"
									className="mt-2 w-full justify-start"
									onClick={() => {
										handleSignOut();
										setIsMenuOpen(false);
									}}
								>
									Sign Out
								</Button>
							) : (
								<Button
									variant="ghost"
									className="mt-2 w-full justify-start"
									onClick={() => {
										router.push(PATHS.AUTH);
										setIsMenuOpen(false);
									}}
								>
									Sign In
								</Button>
							))}
					</div>
				</div>
			)}
		</header>
	);
}
