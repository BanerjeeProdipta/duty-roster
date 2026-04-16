import { z } from "zod";
import { publicProcedure, router } from "../index";
import * as rosterService from "../services/roster";

export const rosterRouter = router({
	getNurses: publicProcedure.query(async () => {
		return rosterService.getNurses();
	}),

	getSchedules: publicProcedure
		.input(
			z.object({
				startDate: z.string(),
				endDate: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const startDate = new Date(input.startDate);
			const endDate = new Date(input.endDate);
			return rosterService.getSchedulesByDateRange(startDate, endDate);
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
