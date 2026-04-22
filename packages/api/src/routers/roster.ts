import { z } from "zod";
import {
	nurseShiftPreferenceSchema,
	schedulesResponseSchema,
	shiftSchema,
} from "../schemas/roster";
import * as rosterService from "../services/roster";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const rosterRouter = router({
	// ─────────────── READS ───────────────

	getNurses: protectedProcedure.query(() => rosterService.getNurses()),

	getShifts: publicProcedure
		.output(z.array(shiftSchema))
		.query(() => rosterService.getShifts()),

	getSchedules: publicProcedure
		.input(
			z
				.object({
					startDate: z.string(),
					endDate: z.string(),
				})
				.refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
					message: "startDate must be before or equal to endDate",
					path: ["endDate"],
				}),
		)
		.output(schedulesResponseSchema)
		.query(({ input }) =>
			rosterService.getSchedulesByDateRange(
				new Date(input.startDate),
				new Date(input.endDate),
			),
		),

	// ─────────────── WRITES ───────────────

	generateRoster: protectedProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.mutation(({ input }) => rosterService.generateRoster(input)),

	updateNurseShiftPreferences: protectedProcedure
		.input(
			z.object({
				preferences: z.array(
					z.object({
						nurseId: z.string(),
						shiftId: z.string(),
						weight: z.number(),
						active: z.boolean(),
					}),
				),
				daysInMonth: z.number().int().min(1),
			}),
		)
		.mutation(({ input }) =>
			rosterService.updateNurseShiftPreferenceWeights(
				input.preferences,
				input.daysInMonth,
			),
		),

	updateShift: protectedProcedure
		.input(z.object({ id: z.string(), shiftId: z.string().nullable() }))
		.mutation(({ input }) =>
			rosterService.updateSchedule(input.id, input.shiftId),
		),
});
