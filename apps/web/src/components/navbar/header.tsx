"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { LayoutDashboard, LogIn, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ADMIN_NAV_ITEMS, PUBLIC_NAV_ITEMS, ROUTES } from "@/lib/paths";

const linkBase =
	"flex items-center gap-1.5 px-3 py-1.5 font-medium text-sm rounded-full transition-all duration-300 ease-out";

export default function Header() {
	const pathname = usePathname();
	const router = useRouter();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { data: session, isPending } = authClient.useSession();

	const isAdmin = (session?.user as { role?: string })?.role === "admin";
	const userName = (session?.user as { name?: string })?.name;

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push(ROUTES.home);
		router.refresh();
		toast.success("Signed out successfully");
	};

	return (
		<header className="sticky top-0 z-[100] w-full border-border/50 border-b bg-white dark:bg-gray-950">
			<div className="relative mx-auto flex h-18 items-center justify-between px-4 sm:px-12 lg:px-20">
				<Link href="/" className="flex h-10 items-center gap-1">
					<LayoutDashboard className="h-8 w-8 rounded bg-accent-primary p-1 text-white" />
					<p className="font-semibold text-xl tracking-tight">
						<span className="text-gray-900 dark:text-gray-100">simple</span>
						<span className="text-gray-500 dark:text-gray-400">roster</span>
					</p>
				</Link>

				<nav className="absolute left-1/2 my-2 hidden -translate-x-1/2 items-center gap-1 rounded-full bg-gray-50 px-3 py-2 md:flex">
					{PUBLIC_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							href={to}
							className={cn(
								linkBase,
								pathname === to
									? "bg-white text-foreground shadow-sm"
									: "text-muted-foreground hover:bg-white/50 hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4" />
							<span>{label}</span>
						</Link>
					))}
					{!isPending &&
						isAdmin &&
						ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
							<Link
								key={to}
								href={to}
								className={cn(
									linkBase,
									pathname === to
										? "bg-white text-foreground shadow-sm"
										: "text-muted-foreground hover:bg-white/50 hover:text-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								<span>{label}</span>
							</Link>
						))}
				</nav>

				{isPending ? (
					<div className="ml-1 hidden h-8 w-20 animate-pulse rounded-md bg-gray-100 md:block dark:bg-gray-800" />
				) : session?.user ? (
					<Button
						variant="secondary"
						className="ml-1 hidden rounded-full text-foreground text-sm md:inline-flex"
						onClick={handleSignOut}
					>
						<LogOut className="h-4 w-4" />
						<span>{userName}</span>
					</Button>
				) : (
					<Button
						variant="secondary"
						className="ml-1 hidden rounded-full md:inline-flex"
						onClick={() => router.push(ROUTES.auth)}
					>
						Sign In
					</Button>
				)}

				<button
					type="button"
					className="flex h-8 w-8 items-center justify-center rounded-full text-foreground md:hidden"
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
						{!isPending &&
							isAdmin &&
							ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
								<Link
									key={to}
									href={to}
									onClick={() => setIsMenuOpen(false)}
									className={cn(
										"flex w-full items-center gap-2 px-3 py-2 font-medium text-sm transition-colors",
										pathname === to
											? "text-foreground"
											: "text-muted-foreground",
									)}
								>
									<Icon className="h-4 w-4" />
									{label}
								</Link>
							))}
						{isPending ? (
							<div className="h-8 w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
						) : session?.user ? (
							<Button
								variant="ghost"
								className="mt-2 w-full justify-start"
								onClick={handleSignOut}
							>
								<LogOut className="h-4 w-4" />
								<span>{userName}</span>
							</Button>
						) : (
							<Button
								variant="ghost"
								className="mt-2 w-full justify-start"
								onClick={() => {
									router.push(ROUTES.auth);
								}}
							>
								<LogIn className="h-4 w-4" />
								Sign In
							</Button>
						)}
					</div>
				</div>
			)}
		</header>
	);
}
