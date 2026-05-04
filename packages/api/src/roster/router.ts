import "regenerator-runtime";
// import * as fs from "node:fs";
import { z } from "zod";

import { adminProcedure, publicProcedure, router } from "../trpc";
import { schedulesResponseSchema, shiftSchema } from "./schema";
import * as rosterService from "./service";

export const rosterRouter = router({
	// ─────────────── READS ───────────────

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

	generateRoster: publicProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.mutation(({ input }) => rosterService.generateRoster(input)),

	prefillFairPreferences: adminProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.mutation(({ input }) =>
			rosterService.prefillFairPreferences(input.year, input.month),
		),

	prefillMinimizeShifts: adminProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.mutation(({ input }) =>
			rosterService.prefillMinimizeShifts(input.year, input.month),
		),

	prefillMaximizeShifts: adminProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.mutation(({ input }) =>
			rosterService.prefillMaximizeShifts(input.year, input.month),
		),

	updateNurseShiftPreferences: adminProcedure
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

	updateShift: adminProcedure
		.input(
			z.object({
				id: z.string(),
				shiftId: z.string().nullable(),
				nurseId: z.string(),
				dateKey: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await rosterService.upsertSchedule(
				input.id,
				input.shiftId,
				input.nurseId,
				input.dateKey,
			);
			return result;
		}),

	updateNurse: adminProcedure
		.input(
			z.object({
				nurseId: z.string(),
				name: z.string().optional(),
				active: z.boolean().optional(),
			}),
		)
		.mutation(({ input }) => rosterService.updateNurse(input)),
});
