"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ROUTES } from "@/lib/paths";

interface UserMenuProps {
	pathname: string;
	mobile?: boolean;
	onNavigate?: () => void;
}

// Admin-only links — only shown after session resolves to an admin user.
const ADMIN_LINKS = [
	{ to: ROUTES.dashboard, label: "Dashboard" },
	{ to: ROUTES.manageUsers, label: "Manage" },
] as const;

/**
 * Isolated client component for auth-dependent header UI.
 * Kept separate from Header so better-auth's client SDK is NOT included
 * in the shared layout chunk — it's only loaded after hydration.
 */
export function UserMenu({ pathname, mobile = false, onNavigate }: UserMenuProps) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div
				className={cn(
					"animate-pulse rounded-md bg-slate-100 dark:bg-slate-800",
					mobile ? "h-8 w-full" : "h-8 w-20 ml-1",
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
			{/* Admin-only nav links — rendered after session resolves */}
			{isAdmin &&
				ADMIN_LINKS.map(({ to, label }) => (
					<Link
						key={to}
						href={to}
						onClick={onNavigate}
						className={cn(
							"font-medium text-sm transition-colors",
							mobile ? "px-3 py-2" : "px-3 py-1.5",
							pathname === to
								? "text-foreground underline underline-offset-4"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{label}
					</Link>
				))}

			<Button
				variant={mobile ? "ghost" : "secondary"}
				className={cn(
					"inline-flex text-foreground text-sm",
					mobile ? "w-full justify-start" : "ml-1",
				)}
				onClick={handleSignOut}
			>
				<LogOut className="h-4 w-4" />
				<span>{userName}</span>
			</Button>
		</>
	);
}

