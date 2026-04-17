import { protectedProcedure, publicProcedure, router } from "../trpc";
import { rosterRouter } from "./roster";

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
	roster: rosterRouter,
});
export type AppRouter = typeof appRouter;
