export const ROUTES = {
	home: "/",
	dashboard: "/dashboard",
	roster: "/roster",
	manageUsers: "/manage-users",
	auth: "/auth",
} as const;

export const ADMIN_ROUTES = [ROUTES.dashboard, ROUTES.manageUsers] as const;

export type RouteKey = keyof typeof ROUTES;
