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
		{ to: "/shift-preference", label: "Manage" },
	] as const;

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/");
		router.refresh();
		toast.success("Signed out successfully");
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
				<Link href="/" className="group flex items-center gap-2 transition-all">
					<div className="rounded-lg border border-red-100 bg-red-50 p-1.5 transition-colors group-hover:bg-red-100">
						<Image
							src="/logo.jpg"
							alt="logo"
							height={24}
							width={36}
							className="rounded"
						/>
					</div>
					<p className="flex items-center font-bold text-xl tracking-tight sm:text-2xl">
						<span className="text-slate-900">simple</span>
						<span className="text-red-800">roster</span>
					</p>
				</Link>

				{/* Desktop Navigation */}
				<nav className="hidden items-center gap-2 md:flex">
					{links.map(({ to, label }) => {
						const isActive = pathname === to;
						return (
							<Link
								key={to}
								href={to}
								className={cn(
									"rounded-md px-3 py-1.5 font-medium text-sm transition-all duration-200",
									isActive
										? "bg-slate-100 text-slate-900 shadow-sm"
										: "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
								)}
							>
								{label}
							</Link>
						);
					})}
					{!isPending && session?.user && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleSignOut}
							className="ml-2"
						>
							Sign Out
						</Button>
					)}
				</nav>

				{/* Mobile Menu Button */}
				<button
					type="button"
					className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-slate-900 transition-colors md:hidden"
					onClick={() => setIsMenuOpen(!isMenuOpen)}
				>
					{isMenuOpen ? (
						<X className="h-5 w-5" />
					) : (
						<Menu className="h-5 w-5" />
					)}
				</button>
			</div>

			{/* Mobile Navigation */}
			{isMenuOpen && (
				<div className="slide-in-from-top-4 animate-in border-t bg-white p-4 transition-all md:hidden">
					<div className="flex flex-col gap-2">
						{links.map(({ to, label }) => {
							const isActive = pathname === to;
							return (
								<Link
									key={to}
									href={to}
									onClick={() => setIsMenuOpen(false)}
									className={cn(
										"rounded-lg px-4 py-3 font-medium transition-colors",
										isActive
											? "bg-slate-100 text-slate-900"
											: "text-slate-600 hover:bg-slate-50",
									)}
								>
									{label}
								</Link>
							);
						})}
						{!isPending && session?.user && (
							<Button
								variant="outline"
								className="mt-2 w-full justify-start py-6"
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
