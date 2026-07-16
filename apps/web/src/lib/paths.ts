import type { Permission } from "@Duty-Roster/config/permissions";
import { PERMISSIONS } from "@Duty-Roster/config/permissions";
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

export type RouteKey = keyof typeof ROUTES;

export interface NavItem {
	to: string;
	label: string;
	icon: LucideIcon;
	permission?: Permission;
}

export const PUBLIC_NAV_ITEMS: NavItem[] = [
	{ to: ROUTES.home, label: "Home", icon: ROUTE_ICONS.home },
	{ to: ROUTES.roster, label: "Roster", icon: ROUTE_ICONS.roster },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
	{
		to: ROUTES.dashboard,
		label: "Dashboard",
		icon: ROUTE_ICONS.dashboard,
		permission: PERMISSIONS.VIEW_DASHBOARD,
	},
	{
		to: ROUTES.manageUsers,
		label: "Manage",
		icon: ROUTE_ICONS.manageUsers,
		permission: PERMISSIONS.MANAGE_ROSTER,
	},
];

export const ALL_NAV_ITEMS: NavItem[] = [
	...PUBLIC_NAV_ITEMS,
	...ADMIN_NAV_ITEMS,
];
