import { z } from "zod";

// ─────────────── SHIFTS ───────────────

export const shiftSchema = z.object({
	id: z.string(),
	name: z.enum(["morning", "evening", "night"]),
	startTime: z.string(),
	endTime: z.string(),
	crossesMidnight: z.boolean(),
});

export type Shift = z.infer<typeof shiftSchema>;

// ─────────────── PREFERENCES ───────────────

export const nurseShiftPreferenceSchema = z.object({
	nurseId: z.string(),
	name: z.string(),
	morning: z.number().optional().default(0),
	evening: z.number().optional().default(0),
	night: z.number().optional().default(0),
	active: z.boolean().optional().default(true),
});

export type NurseShiftPreference = z.infer<typeof nurseShiftPreferenceSchema>;

// ─────────────── SCHEDULES ───────────────

const shiftCountsSchema = z.object({
	morning: z.number(),
	evening: z.number(),
	night: z.number(),
	totalAssigned: z.number(),
});

export const schedulesResponseSchema = z.object({
	nurseRows: z.array(
		z.object({
			nurse: z.object({
				id: z.string(),
				name: z.string(),
				active: z.boolean().optional(),
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

export type SchedulesResponse = z.infer<typeof schedulesResponseSchema>;
