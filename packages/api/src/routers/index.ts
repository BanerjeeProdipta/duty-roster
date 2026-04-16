import { protectedProcedure, publicProcedure, router } from "../index";
import { rosterRouter } from "./roster";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	roster: rosterRouter,
});
export type AppRouter = typeof appRouter;
