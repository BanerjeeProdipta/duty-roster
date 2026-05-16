"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ADMIN_NAV_ITEMS, ROUTES } from "@/lib/paths";

interface UserMenuProps {
	pathname: string;
	mobile?: boolean;
	onNavigate?: () => void;
	mode?: "links" | "auth" | "all";
}

/**
 * Isolated client component for auth-dependent header UI.
 * Kept separate from Header so better-auth's client SDK is NOT included
 * in the shared layout chunk — it's only loaded after hydration.
 */
export function UserMenu({
	pathname,
	mobile = false,
	onNavigate,
	mode = "all",
}: UserMenuProps) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		if (mode === "links") return null;
		return (
			<div
				className={cn(
					"animate-pulse rounded-md bg-gray-100 dark:bg-gray-800",
					mobile ? "h-8 w-full" : "ml-1 h-8 w-20",
				)}
			/>
		);
	}

	const isAdmin = (session?.user as { role?: string })?.role === "admin";
	const userName = (session?.user as { name?: string })?.name;

	const handleSignOut = async () => {
		await authClient.signOut();
		onNavigate?.();
		router.push(ROUTES.home);
		router.refresh();
		toast.success("Signed out successfully");
	};

	if (!session?.user) {
		if (mode === "links") return null;
		return (
			<Button
				variant={mobile ? "ghost" : "secondary"}
				className={cn("ml-1", mobile && "mt-2 w-full justify-start")}
				onClick={() => {
					router.push(ROUTES.auth);
					onNavigate?.();
				}}
			>
				Sign In
			</Button>
		);
	}

	return (
		<>
			{(mode === "links" || mode === "all") &&
				isAdmin &&
				ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
					<Link
						key={to}
						href={to}
						data-active={!mobile && pathname === to}
						onClick={onNavigate}
						className={cn(
							"flex items-center gap-1.5 font-medium text-sm transition-colors",
							mobile ? "px-3 py-2" : "relative z-10 rounded-full px-3 py-1.5",
							pathname === to
								? "text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="h-4 w-4" />
						{label}
					</Link>
				))}

			{(mode === "auth" || mode === "all") && (
				<Button
					variant={mobile ? "ghost" : "secondary"}
					className={cn(
						"inline-flex rounded-full text-foreground text-sm",
						mobile ? "w-full justify-start" : "ml-1",
					)}
					onClick={handleSignOut}
				>
					<LogOut className="h-4 w-4" />
					<span>{userName}</span>
				</Button>
			)}
		</>
	);
}
