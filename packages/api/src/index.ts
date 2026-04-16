import { appRouter } from "./routers";

export type { AppRouter } from "./routers";
export {
	createCallerFactory,
	protectedProcedure,
	publicProcedure,
	router,
} from "./trpc";
export { appRouter };
