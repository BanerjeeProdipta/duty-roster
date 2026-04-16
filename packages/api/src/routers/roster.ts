import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../index";
import * as rosterService from "../services/roster";

export const rosterRouter = router({
	getNurses: publicProcedure.query(async () => {
		return rosterService.getNurses();
	}),

	generate: publicProcedure
		.input(
			z.object({
				year: z.number(),
				month: z.number(), // 1-12
			}),
		)
		.mutation(async ({ input }) => {
			return rosterService.generateRoster(input);
		}),
});
