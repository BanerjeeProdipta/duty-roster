import type { LucideIcon } from "lucide-react";
import { CalendarDays, Grid2X2, Home, Users } from "lucide-react";

export const ROUTES = {
	home: "/",
	dashboard: "/dashboard",
	roster: "/roster",
	manageUsers: "/manage-users",
	auth: "/auth",
} as const;

export const ROUTE_ICONS: Record<keyof typeof ROUTES, LucideIcon> = {
	home: Home,
	roster: CalendarDays,
	dashboard: Grid2X2,
	manageUsers: Users,
	auth: Users,
} as const;

export const ADMIN_ROUTES = [ROUTES.dashboard, ROUTES.manageUsers] as const;

export type RouteKey = keyof typeof ROUTES;
