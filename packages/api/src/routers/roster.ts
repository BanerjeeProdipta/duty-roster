import { z } from "zod";
import * as rosterService from "../services/roster";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const shiftCountsSchema = z.object({
	morning: z.number(),
	evening: z.number(),
	night: z.number(),
	totalAssigned: z.number(),
});

const schedulesResponseSchema = z.object({
	nurseRows: z.array(
		z.object({
			nurse: z.object({
				id: z.string(),
				name: z.string(),
			}),
			shifts: shiftCountsSchema,
			assignments: z.record(
				z.string(),
				z
					.object({
						id: z.string(),
						shiftType: z.enum(["morning", "evening", "night", "off"]),
					})
					.nullable(),
			),
			preference: z
				.object({
					morning: z.number().optional(),
					evening: z.number().optional(),
					night: z.number().optional(),
				})
				.optional(),
		}),
	),
	dailyShiftCounts: z.record(z.string(), shiftCountsSchema),
});

export const rosterRouter = router({
	getNurses: protectedProcedure.query(async () => {
		return rosterService.getNurses();
	}),

	getSchedules: publicProcedure
		.input(
			z
				.object({
					startDate: z.string(),
					endDate: z.string(),
				})
				.refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
					message: "startDate must be before or equal to endDate",
					path: ["endDate"],
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
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
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

	getNurseShiftPreferences: publicProcedure.query(async () => {
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

	getMonthlyShiftRequirements: publicProcedure
		.input(
			z.object({
				year: z.number().int().min(2000).max(2100),
				month: z.number().int().min(1).max(12),
			}),
		)
		.output(
			z.object({
				year: z.number(),
				month: z.number(),
				daysInMonth: z.number(),
				dayOfWeekCounts: z.object({
					monday: z.number(),
					tuesday: z.number(),
					wednesday: z.number(),
					thursday: z.number(),
					friday: z.number(),
					saturday: z.number(),
					sunday: z.number(),
				}),
				shiftRequirements: z.object({
					morning: z.number(),
					evening: z.number(),
					night: z.number(),
					total: z.number(),
				}),
				assignedShiftCounts: z.object({
					morning: z.number(),
					evening: z.number(),
					night: z.number(),
					total: z.number(),
				}),
			}),
		)
		.query(async ({ input }) => {
			return rosterService.getMonthlyShiftRequirements(input.year, input.month);
		}),
});
