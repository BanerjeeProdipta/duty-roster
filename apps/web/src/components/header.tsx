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
					className="inline-flex gap-2 font-bold text-2xl tracking-tight"
				>
					<Image src="/logo.jpg" alt="logo" height={20} width={30} />
					<p className="font-bold text-3xl">
						<span>simple</span>
						<span className="text-red-700">roster</span>
					</p>
				</Link>
				<nav className="flex items-center gap-6">
					{links.map(({ to, label }) => {
						const isActive = pathname === to;
						return (
							<Link
								key={to}
								href={to}
								className={cn(
									"font-medium text-sm transition-colors",
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
						<Button variant="outline" size="sm" onClick={handleSignOut}>
							Sign Out
						</Button>
					)}
				</nav>
			</div>
		</header>
	);
}
