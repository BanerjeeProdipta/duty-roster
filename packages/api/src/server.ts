export type { AppRouter } from "./router";
export { appRouter } from "./router";

export {
	createCallerFactory,
	protectedProcedure,
	publicProcedure,
	requirePermission,
	router,
} from "./trpc";
