import { z } from "zod";
import * as rosterService from "../services/roster";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const scheduleRowSchema = z.object({
	id: z.string(),
	date: z.string(),
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

const shiftCountsSchema = z.object({
	morning: z.number(),
	evening: z.number(),
	night: z.number(),
	totalAssigned: z.number(),
});

const schedulesResponseSchema = z.object({
	schedules: z.array(scheduleRowSchema),
	dailyShiftCounts: z.array(
		z.object({
			date: z.string(),
			shifts: shiftCountsSchema,
		}),
	),
	nurseShiftCounts: z.array(
		z.object({
			nurse: z.object({
				id: z.string(),
				name: z.string(),
			}),
			shifts: shiftCountsSchema,
		}),
	),
});

export const rosterRouter = router({
	getNurses: protectedProcedure.query(async () => {
		return rosterService.getNurses();
	}),

	getSchedules: publicProcedure
		.input(
			z.object({
				startDate: z.string(),
				endDate: z.string(),
			}),
		)
		.output(schedulesResponseSchema)
		.query(async ({ input }) => {
			const startDate = new Date(input.startDate);
			const endDate = new Date(input.endDate);
			return rosterService.getSchedulesByDateRange(startDate, endDate);
		}),

	generateRoster: protectedProcedure
		.input(
			z.object({
				year: z.number(),
				month: z.number(), // 1-12
			}),
		)
		.output(
			z.object({
				year: z.number(),
				month: z.number(),
				schedulesCreated: z.number(),
				coverage: z.object({
					weekday: z.object({
						morning: z.number(),
						evening: z.number(),
						night: z.number(),
					}),
					friday: z.object({
						morning: z.number(),
						evening: z.number(),
						night: z.number(),
					}),
				}),
				constraints: z.object({
					maxNightsPerNurse: z.number(),
					minDaysOffPerWeek: z.number(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			return rosterService.generateRoster(input);
		}),

	getNurseShiftPreferences: protectedProcedure.query(async () => {
		return rosterService.listNurseShiftPreferenceWeights();
	}),

	updateNurseShiftPreferences: protectedProcedure
		.input(
			z.array(
				z.object({
					nurseId: z.string(),
					shiftId: z.string(),
					weight: z.number(),
				}),
			),
		)
		.mutation(async ({ input }) => {
			return rosterService.updateNurseShiftPreferenceWeights(input);
		}),

	updateShift: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				shiftId: z.string().nullable(),
			}),
		)
		.mutation(async ({ input }) => {
			return rosterService.updateSchedule(input.id, input.shiftId);
		}),
});
