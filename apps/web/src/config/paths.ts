export const PATHS = {
	HOME: "/",
	AUTH: "/auth",
	DASHBOARD: "/dashboard",
	ROSTER: "/roster",
	MANAGE_USERS: "/manage-users",
} as const;

export const ADMIN_PATHS = [PATHS.DASHBOARD, PATHS.MANAGE_USERS];

export const PUBLIC_PATHS = [PATHS.HOME, PATHS.ROSTER, PATHS.AUTH];
