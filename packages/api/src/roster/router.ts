import { PERMISSIONS } from "@Duty-Roster/config/permissions";
import "regenerator-runtime";
import { z } from "zod";

import { publicProcedure, requirePermission, router } from "../trpc";
import { schedulesResponseSchema, shiftSchema } from "./schema";
import * as rosterService from "./service";

const manageRosterProcedure = requirePermission(PERMISSIONS.MANAGE_ROSTER);

export const rosterRouter = router({
	// ─────────────── READS ───────────────

	getShifts: publicProcedure
		.output(z.array(shiftSchema))
		.query(() => rosterService.getShifts()),

	getNurses: publicProcedure
		.output(z.array(z.object({ id: z.string(), name: z.string() })))
		.query(() => rosterService.getAllNurses()),

	searchNurseNames: publicProcedure
		.input(z.object({ q: z.string().min(1) }))
		.output(z.array(z.object({ id: z.string(), name: z.string() })))
		.query(({ input }) => rosterService.searchNurseNames(input.q)),

	getSchedules: publicProcedure
		.input(
			z
				.object({
					startDate: z.string(),
					endDate: z.string(),
					page: z.number().int().positive().optional(),
					pageSize: z.number().int().positive().max(100).optional(),
					q: z.string().optional(),
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
				input.page,
				input.pageSize,
				input.q,
			),
		),

	// ─────────────── WRITES ───────────────

	generateRoster: manageRosterProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.mutation(({ input }) => rosterService.generateRoster(input)),

	prefillDefault: manageRosterProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.mutation(({ input }) =>
			rosterService.prefillDefault(input.year, input.month),
		),

	updateNurseShiftPreferences: manageRosterProcedure
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

	updateShift: manageRosterProcedure
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

	batchUpdateShifts: manageRosterProcedure
		.input(
			z.array(
				z.object({
					id: z.string(),
					shiftId: z.string().nullable(),
					nurseId: z.string(),
					dateKey: z.string(),
				}),
			),
		)
		.mutation(async ({ input }) => {
			return rosterService.batchUpsertSchedules(input);
		}),

	updateNurse: manageRosterProcedure
		.input(
			z.object({
				nurseId: z.string(),
				name: z.string().optional(),
				active: z.boolean().optional(),
				designation: z.string().optional(),
				sortOrder: z.number().int().optional(),
			}),
		)
		.mutation(({ input }) => rosterService.updateNurse(input)),

	deleteNurse: manageRosterProcedure
		.input(z.object({ nurseId: z.string() }))
		.mutation(({ input }) => rosterService.deleteNurse(input.nurseId)),

	createNurse: manageRosterProcedure
		.input(
			z
				.object({
					name: z.string().min(1, "Name is required"),
					morning: z.number().int().min(0).max(100),
					evening: z.number().int().min(0).max(100),
					night: z.number().int().min(0).max(100),
				})
				.refine((d) => d.morning + d.evening + d.night <= 100, {
					message: "Total preference must not exceed 100",
					path: ["night"],
				}),
		)
		.mutation(({ input }) => rosterService.createNurse(input)),
});
