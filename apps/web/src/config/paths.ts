export const PATHS = {
	HOME: "/",
	AUTH: "/auth",
	DASHBOARD: "/dashboard",
	ROSTER: "/roster",
	MANAGE_USERS: "/manage-users",
} as const;

export const ADMIN_PATHS = [PATHS.DASHBOARD, PATHS.MANAGE_USERS] as const;

export const PUBLIC_PATHS = [PATHS.HOME, PATHS.ROSTER, PATHS.AUTH] as const;

export const PUBLIC_NAV_LINKS = [
	{ to: PATHS.HOME, label: "Home" },
	{ to: PATHS.ROSTER, label: "Roster" },
] as const;

export const ADMIN_NAV_LINKS = [
	{ to: PATHS.DASHBOARD, label: "Dashboard" },
	{ to: PATHS.MANAGE_USERS, label: "Manage" },
] as const;
