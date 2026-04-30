"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ROUTES } from "@/lib/paths";

export default function Header() {
	const pathname = usePathname();
	const router = useRouter();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();

	const isAdmin = (session?.user as { role?: string })?.role === "admin";
	const userName = (session?.user as { name?: string })?.name;

	const links = [
		{ to: ROUTES.home, label: "Home" },
		{ to: ROUTES.roster, label: "Roster" },
		...(session?.user && isAdmin
			? [
					{ to: ROUTES.dashboard, label: "Dashboard" },
					{ to: ROUTES.manageUsers, label: "Manage" },
				]
			: []),
	] as const;

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push(ROUTES.home);
		router.refresh();
		toast.success("Signed out successfully");
	};

	return (
		<header className="sticky top-0 z-[100] w-full border-border/50 border-b bg-white backdrop-blur-md dark:bg-slate-950/80">
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
				<Link href="/" className="flex h-10 w-10 items-center">
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
					{!isSessionPending &&
						(session?.user ? (
							<>
								<Button
									variant="secondary"
									onClick={handleSignOut}
									className="ml-1 inline-flex text-foreground text-sm"
								>
									<LogOut />

									<span className="">{userName}</span>
								</Button>
							</>
						) : (
							<Button
								variant="secondary"
								onClick={() => router.push(ROUTES.auth)}
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
						{!isSessionPending &&
							(session?.user ? (
								<>
									<Button
										variant="ghost"
										className="w-full justify-start"
										onClick={() => {
											handleSignOut();
											setIsMenuOpen(false);
										}}
									>
										<LogOut />

										<span className="text-foreground text-sm">{userName}</span>
									</Button>
								</>
							) : (
								<Button
									variant="ghost"
									className="mt-2 w-full justify-start"
									onClick={() => {
										router.push(ROUTES.auth);
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
