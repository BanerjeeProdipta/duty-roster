"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export default function Header() {
	const pathname = usePathname();
	const router = useRouter();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { data: session, isPending } = authClient.useSession();

	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/manage-users", label: "Manage" },
	] as const;

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/");
		router.refresh();
		toast.success("Signed out successfully");
	};

	return (
		<header className="sticky top-0 z-[100] w-full border-border/50 border-b bg-white backdrop-blur-md dark:bg-slate-950/80">
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
				<Link href="/" className="flex items-center gap-2">
					<Image
						src="/logo.jpg"
						alt="logo"
						height={22}
						width={32}
						className="rounded-sm"
					/>
					<p className="font-semibold text-lg tracking-tight">
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
										? "text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{label}
							</Link>
						);
					})}
					{!isPending && session?.user && (
						<Button
							variant="secondary"
							onClick={handleSignOut}
							className="ml-1"
						>
							Sign Out
						</Button>
					)}
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
						{!isPending && session?.user && (
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
						)}
					</div>
				</div>
			)}
		</header>
	);
}
