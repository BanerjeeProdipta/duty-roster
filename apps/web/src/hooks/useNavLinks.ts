import { usePathname } from "next/navigation";
import { ADMIN_PATHS, PATHS } from "@/config/paths";
import { authClient } from "@/lib/auth-client";

const PUBLIC_LINKS = [
	{ to: PATHS.HOME, label: "Home" },
	{ to: PATHS.ROSTER, label: "Roster" },
] as const;

const ADMIN_LINKS = [
	{ to: PATHS.DASHBOARD, label: "Dashboard" },
	{ to: PATHS.MANAGE_USERS, label: "Manage" },
] as const;

export function useNavLinks() {
	const pathname = usePathname();
	const { data: session } = authClient.useSession();
	const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

	const links = session?.user
		? [...PUBLIC_LINKS, ...(isAdminPath ? ADMIN_LINKS : [])]
		: PUBLIC_LINKS;

	return { links, pathname };
}
