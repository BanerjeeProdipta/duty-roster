import { rosterRouter } from "./roster";
import { protectedProcedure, publicProcedure, router } from "./trpc";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		const session = ctx.session as { user: unknown } | null;
		return {
			message: "This is private",
			user: session?.user ?? null,
		};
	}),
	getCurrentUser: protectedProcedure.query(({ ctx }) => {
		const session = ctx.session as {
			user: { id: string; name?: string; email?: string; role?: string };
		} | null;
		return session?.user ?? null;
	}),
	roster: rosterRouter,
});

export type AppRouter = typeof appRouter;
