import "regenerator-runtime";
// import * as fs from "node:fs";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
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
		.input(
			z.object({
				id: z.string(),
				shiftId: z.string().nullable(),
				nurseId: z.string(),
				dateKey: z.string(),
			}),
		)
		.mutation(({ input }) =>
			rosterService.upsertSchedule(
				input.id,
				input.shiftId,
				input.nurseId,
				input.dateKey,
			),
		),

	downloadPDF: publicProcedure
		.input(z.object({ startDate: z.string(), endDate: z.string() }))
		.query(async ({ input }) => {
			const schedules = await rosterService.getSchedulesByDateRange(
				new Date(input.startDate),
				new Date(input.endDate),
			);

			const shiftLetter: Record<string, string> = {
				morning: "M",
				evening: "E",
				night: "N",
				off: "O",
			};

			const dates: Array<{ dayName: string; date: number }> = [];
			const start = new Date(input.startDate);
			const end = new Date(input.endDate);
			const currentYear = new Date().getFullYear();

			for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
				dates.push({
					dayName: d.toLocaleString("en-US", { weekday: "long" }).slice(0, 3),
					date: d.getDate(),
				});
			}

			const rosterMonthName = new Date(start).toLocaleString("en-US", {
				month: "long",
				year: "numeric",
			});

			const rows = (schedules?.nurseRows ?? []).map((row) => {
				const rowData: Record<string, string> = { Name: row.nurse.name };
				for (const dateObj of dates) {
					const shortMonth = new Date(start).toLocaleString("en-US", {
						month: "short",
					});
					const monthIndex = new Date(`${shortMonth} 1 2024`).getMonth() + 1;
					const dateKey = `${currentYear}-${String(monthIndex).padStart(2, "0")}-${String(dateObj.date).padStart(2, "0")}`;
					const assignment = row.assignments[dateKey];
					rowData[`${dateObj.dayName} ${dateObj.date}`] = assignment
						? (shiftLetter[assignment.shiftType] ?? "?")
						: "O";
				}
				return rowData;
			});

			const pdfDoc = await PDFDocument.create();
			pdfDoc.registerFontkit(fontkit);
			// const banglaFont = await pdfDoc.embedFont(fontBytes);
			const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
			const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
			const banglaFont = boldFont; // Fallback to bold for now

			// A4 landscape: 841.89 x 595.28 pts
			const PAGE_WIDTH = 841.89;
			const PAGE_HEIGHT = 595.28;
			const MARGIN = 14;
			const NURSES_PER_PAGE = 15;

			const chunks: (typeof rows)[] = [];
			for (let i = 0; i < rows.length; i += NURSES_PER_PAGE) {
				chunks.push(rows.slice(i, i + NURSES_PER_PAGE));
			}
			// Always 2 pages
			while (chunks.length < 2) chunks.push([]);

			const nameColWidth = 110;
			const availableWidth = PAGE_WIDTH - MARGIN * 2 - nameColWidth;
			const dayColWidth = availableWidth / dates.length;

			const HEADER_HEIGHT = 28;
			const ROW_HEIGHT = 22;
			const TABLE_TOP = PAGE_HEIGHT - 80; // below title rows

			// Shift colors - grayscale only
			const shiftColors: Record<string, ReturnType<typeof rgb>> = {
				M: rgb(1, 1, 1),
				E: rgb(1, 1, 1),
				N: rgb(1, 1, 1),
				O: rgb(1, 1, 1),
			};

			for (const [pageIdx, nurseChunk] of chunks.entries()) {
				const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

				// --- Title ---
				page.drawText("উপজেলা স্বাস্থ্য কমপ্লেক্স", {
					x: PAGE_WIDTH / 2 - 90,
					y: PAGE_HEIGHT - 30,
					size: 16,
					font: banglaFont,
					color: rgb(0, 0, 0),
				});

				page.drawText(`নার্সেস রোস্টার — ${rosterMonthName}`, {
					x: PAGE_WIDTH / 2 - 80,
					y: PAGE_HEIGHT - 52,
					size: 11,
					font: banglaFont,
					color: rgb(0.2, 0.2, 0.2),
				});

				if (chunks.length > 1) {
					page.drawText(`Page ${pageIdx + 1} of ${chunks.length}`, {
						x: PAGE_WIDTH - MARGIN - 60,
						y: PAGE_HEIGHT - 20,
						size: 8,
						font: regularFont,
						color: rgb(0.5, 0.5, 0.5),
					});
				}

				// --- Header row ---
				const headerY = TABLE_TOP;

				// "Name" header
				page.drawRectangle({
					x: MARGIN,
					y: headerY - HEADER_HEIGHT,
					width: nameColWidth,
					height: HEADER_HEIGHT,
					color: rgb(0.83, 0.83, 0.83),
					borderColor: rgb(0, 0, 0),
					borderWidth: 0.5,
				});
				page.drawText("Name", {
					x: MARGIN + 4,
					y: headerY - HEADER_HEIGHT / 2 - 4,
					size: 8,
					font: boldFont,
					color: rgb(0, 0, 0),
				});

				// Date headers
				for (const [i, dateObj] of dates.entries()) {
					const x = MARGIN + nameColWidth + i * dayColWidth;
					page.drawRectangle({
						x,
						y: headerY - HEADER_HEIGHT,
						width: dayColWidth,
						height: HEADER_HEIGHT,
						color: rgb(0.83, 0.83, 0.83),
						borderColor: rgb(0, 0, 0),
						borderWidth: 0.5,
					});
					page.drawText(dateObj.dayName.slice(0, 3), {
						x: x + dayColWidth / 2 - 6,
						y: headerY - 12,
						size: 6,
						font: boldFont,
						color: rgb(0, 0, 0),
					});
					page.drawText(String(dateObj.date), {
						x: x + dayColWidth / 2 - 4,
						y: headerY - 22,
						size: 7,
						font: boldFont,
						color: rgb(0, 0, 0),
					});
				}

				// --- Nurse rows ---
				for (const [ni, nurse] of nurseChunk.entries()) {
					const rowY = headerY - HEADER_HEIGHT - ni * ROW_HEIGHT;
					const rowBg = ni % 2 === 0 ? rgb(1, 1, 1) : rgb(0.94, 0.94, 0.94);

					// Name cell
					page.drawRectangle({
						x: MARGIN,
						y: rowY - ROW_HEIGHT,
						width: nameColWidth,
						height: ROW_HEIGHT,
						color: rowBg,
						borderColor: rgb(0.6, 0.6, 0.6),
						borderWidth: 0.3,
					});
					page.drawText(nurse.Name ?? "", {
						x: MARGIN + 3,
						y: rowY - ROW_HEIGHT / 2 - 3,
						size: 7,
						font: banglaFont,
						color: rgb(0, 0, 0),
						maxWidth: nameColWidth - 6,
					});

					// Shift cells
					for (const [i, dateObj] of dates.entries()) {
						const colKey = `${dateObj.dayName} ${dateObj.date}`;
						const letter = nurse[colKey] ?? "O";
						const x = MARGIN + nameColWidth + i * dayColWidth;
						const cellColor = shiftColors[letter] ?? rowBg;

						page.drawRectangle({
							x,
							y: rowY - ROW_HEIGHT,
							width: dayColWidth,
							height: ROW_HEIGHT,
							color: cellColor,
							borderColor: rgb(0.6, 0.6, 0.6),
							borderWidth: 0.3,
						});
						page.drawText(letter, {
							x: x + dayColWidth / 2 - 3,
							y: rowY - ROW_HEIGHT / 2 - 3,
							size: 7,
							font: boldFont,
							color: rgb(0, 0, 0),
						});
					}
				}

				// --- Legend ---
				const legendY = MARGIN + 20;
				const legendItems = [
					{ label: "M = Morning", color: shiftColors.M },
					{ label: "E = Evening", color: shiftColors.E },
					{ label: "N = Night", color: shiftColors.N },
					{ label: "O = Off", color: shiftColors.O },
				];
				let lx = MARGIN;
				for (const item of legendItems) {
					page.drawRectangle({
						x: lx,
						y: legendY - 8,
						width: 10,
						height: 10,
						color: item.color,
						borderColor: rgb(0, 0, 0),
						borderWidth: 0.3,
					});
					page.drawText(item.label, {
						x: lx + 13,
						y: legendY - 4,
						size: 7,
						font: regularFont,
						color: rgb(0, 0, 0),
					});
					lx += 90;
				}
			}

			const pdfBytes = await pdfDoc.save();
			return Buffer.from(pdfBytes).toString("base64");
		}),
});
