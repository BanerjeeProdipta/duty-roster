import type { Permission } from "@Duty-Roster/config/permissions";
import { can } from "@Duty-Roster/config/permissions";
import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}

	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

export function requirePermission(permission: Permission) {
	return protectedProcedure.use(({ ctx, next }) => {
		const session = ctx.session as { user: unknown } | null;
		const user = session?.user as { role?: string } | null;

		if (!can(user?.role, permission)) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Insufficient permissions",
				cause: `Missing permission: ${permission}`,
			});
		}

		return next({ ctx });
	});
}
