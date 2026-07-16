export const PERMISSIONS = {
	VIEW_ROSTER: "view:roster",
	MANAGE_ROSTER: "manage:roster",
	VIEW_DASHBOARD: "view:dashboard",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Ordered low -> high. Each role lists only the permissions it adds on top of
// every role before it. To add a role (e.g. "manager" between "user" and
// "admin"), insert one entry here — no other file needs to change.
const ROLE_HIERARCHY = [
	{ role: "user", permissions: [PERMISSIONS.VIEW_ROSTER] },
	{
		role: "admin",
		permissions: [PERMISSIONS.MANAGE_ROSTER, PERMISSIONS.VIEW_DASHBOARD],
	},
] as const satisfies readonly {
	role: string;
	permissions: readonly Permission[];
}[];

export type Role = (typeof ROLE_HIERARCHY)[number]["role"];

const ROLE_ORDER: readonly Role[] = ROLE_HIERARCHY.map((entry) => entry.role);

const ACCUMULATED_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = (() => {
	const result = {} as Record<Role, ReadonlySet<Permission>>;
	const running = new Set<Permission>();
	for (const entry of ROLE_HIERARCHY) {
		for (const permission of entry.permissions) running.add(permission);
		result[entry.role] = new Set(running);
	}
	return result;
})();

export function isKnownRole(role: string | null | undefined): role is Role {
	return !!role && (ROLE_ORDER as readonly string[]).includes(role);
}

/**
 * `context` is an unused extension point reserved for future attribute-based
 * rules (e.g. matching a department on the resource) without another
 * signature change at every call site.
 */
export function can(
	role: string | null | undefined,
	permission: Permission,
	_context?: Record<string, unknown>,
): boolean {
	if (!isKnownRole(role)) return false;
	return ACCUMULATED_PERMISSIONS[role].has(permission);
}

export function roleAtLeast(
	role: string | null | undefined,
	minRole: Role,
): boolean {
	if (!isKnownRole(role)) return false;
	return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minRole);
}
