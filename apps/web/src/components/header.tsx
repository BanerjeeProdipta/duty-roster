"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
	const pathname = usePathname();
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<header className="border-b bg-background/80 px-3 backdrop-blur-sm sm:px-6">
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3">
				<div className="flex items-center gap-4 sm:gap-8">
					<Link href="/" className="font-bold text-2xl italic tracking-tight">
						<p className="font-bold">simple-roster</p>
					</Link>
					<nav className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
						{links.map(({ to, label }) => {
							const isActive = pathname === to;
							return (
								<Link
									key={to}
									href={to}
									className={cn(
										"rounded-md px-3 py-1 font-medium text-sm transition-colors sm:text-base",
										isActive
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{label}
								</Link>
							);
						})}
					</nav>
				</div>
			</div>
		</header>
	);
}
