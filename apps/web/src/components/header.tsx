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
	] as const;

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/");
		router.refresh();
		toast.success("Signed out successfully");
	};

	return (
		<header className="border-b bg-background/80 px-3 backdrop-blur-sm sm:px-6">
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3">
				<div className="flex items-center gap-4 sm:gap-8">
					<Link
						href="/"
						className="inline-flex gap-2 font-bold text-2xl italic tracking-tight"
					>
						<Image src="/logo.jpg" alt="logo" height={20} width={30} />
						<p className="font-bold">
							<span>simple</span>
							<span className="text-red-700">roster</span>
						</p>
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
				{!isPending && session?.user && (
					<Button variant="default" onClick={handleSignOut}>
						Sign Out
					</Button>
				)}
			</div>
		</header>
	);
}
