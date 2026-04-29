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

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
	const session = ctx.session as { user: { role?: string } } | null;
	const role = session?.user?.role;

	if (role !== "admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Admin access required",
			cause: "Not an admin",
		});
	}

	return next({ ctx });
});
