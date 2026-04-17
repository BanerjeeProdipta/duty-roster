"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export default function Header() {
	const pathname = usePathname();
	const router = useRouter();
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
		<header className="border-b px-4 py-4 sm:px-6">
			<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6">
				<Link
					href="/"
					className="group inline-flex items-center gap-2 transition-all"
				>
					<div className="rounded-lg border border-red-100 bg-red-50 p-1.5 transition-colors group-hover:bg-red-100">
						<Image
							src="/logo.jpg"
							alt="logo"
							height={24}
							width={36}
							className="rounded"
						/>
					</div>
					<p className="font-bold text-2xl tracking-tight">
						<span className="text-slate-900">simple</span>
						<span className="text-red-800">roster</span>
					</p>
				</Link>
				<nav className="flex items-center gap-1 sm:gap-2">
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
						<Button variant="outline" size="sm" onClick={handleSignOut}>
							Sign Out
						</Button>
					)}
				</nav>
			</div>
		</header>
	);
}
