import { z } from "zod";
import * as rosterService from "../services/roster";
import { publicProcedure, router } from "../trpc";

const scheduleRowSchema = z.object({
	id: z.string(),
	date: z.date(),
	nurse: z.object({
		id: z.string(),
		name: z.string(),
	}),
	shift: z
		.object({
			id: z.string(),
		})
		.nullable(),
});

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
		.output(z.array(scheduleRowSchema))
		.query(async ({ input }) => {
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
