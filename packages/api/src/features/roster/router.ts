import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { schedulesResponseSchema, shiftSchema } from "./schema";
import * as rosterService from "./service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require("exceljs");

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

	downloadCSV: publicProcedure
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
				const day = d.getDate();
				const dayName = d.toLocaleString("en-US", { weekday: "short" });
				dates.push({ dayName, date: day });
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
					const letter = assignment
						? (shiftLetter[assignment.shiftType] ?? "?")
						: "O";

					const colKey = `${dateObj.dayName} ${dateObj.date}`;
					rowData[colKey] = letter;
				}
				return rowData;
			});

			const nurseChunks = [];
			for (let i = 0; i < rows.length; i += 16) {
				nurseChunks.push(rows.slice(i, i + 16));
			}

			const templatePath = path.join(
				process.cwd(),
				"apps/web/public/roster-template.xlsx",
			);
			const templateBuffer = fs.readFileSync(templatePath);
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(templateBuffer);

			const light_gray = "FFD3D3D3";
			const lighter_gray = "FFF0F0F0";
			const white = "FFFFFFFF";
			const headerBorder = {
				left: { style: "thin" as const, color: { argb: "FF000000" } },
				right: { style: "thin" as const, color: { argb: "FF000000" } },
				top: { style: "thin" as const, color: { argb: "FF000000" } },
				bottom: { style: "thin" as const, color: { argb: "FF000000" } },
			};

			nurseChunks.forEach((chunkNurses, pageIndex) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let worksheet: any;

				if (pageIndex === 0) {
					worksheet =
						workbook.getWorksheet("Roster") || workbook.getWorksheet(1);
				} else {
					worksheet = workbook.addWorksheet(`Roster P${pageIndex + 1}`);
				}

				worksheet.pageSetup = {
					margins: {
						left: 0.2,
						right: 0.2,
						top: 0.35,
						bottom: 0.35,
						header: 0.2,
						footer: 0.2,
					},
					paperSize: 9,
					orientation: "landscape",
				};

				const titleRow = worksheet.getRow(1);
				titleRow.getCell(1).value = "উপজেলা স্বাস্থ্য কমপ্লেক্স";
				titleRow.height = 24;
				titleRow.getCell(1).font = { name: "Calibri", size: 16, bold: true };
				titleRow.getCell(1).alignment = {
					horizontal: "center" as const,
					vertical: "middle" as const,
				};

				const monthRow = worksheet.getRow(2);
				monthRow.getCell(1).value = rosterMonthName;
				monthRow.height = 20;
				monthRow.getCell(1).font = { name: "Calibri", size: 13, bold: true };
				monthRow.getCell(1).alignment = {
					horizontal: "center" as const,
					vertical: "middle" as const,
				};

				const headerData = ["Name"];
				for (const dateObj of dates) {
					headerData.push(`${dateObj.dayName}\n${dateObj.date}`);
				}

				const headerRow = worksheet.getRow(4);
				headerData.forEach((header, idx) => {
					const cell = headerRow.getCell(idx + 1);
					cell.value = header;
					cell.font = { name: "Calibri", size: 7, bold: true };
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: light_gray },
					};
					cell.alignment = {
						horizontal: "center" as const,
						vertical: "middle" as const,
						wrapText: true,
					};
					cell.border = headerBorder;
				});
				headerRow.height = 28;

				chunkNurses.forEach((nurse, nurseIndex) => {
					const isGrayRow = nurseIndex % 2 === 1;
					const rowFill = isGrayRow ? lighter_gray : white;

					const rowData = [nurse.Name];
					for (const dateObj of dates) {
						const colKey = `${dateObj.dayName} ${dateObj.date}`;
						rowData.push(nurse[colKey] || "");
					}

					const dataRowIndex = 5 + nurseIndex;
					const dataRow = worksheet.getRow(dataRowIndex);

					rowData.forEach((val, colIdx) => {
						const cell = dataRow.getCell(colIdx + 1);
						cell.value = val;

						if (colIdx === 0) {
							cell.font = { name: "Calibri", size: 8, bold: true };
							cell.alignment = {
								horizontal: "left",
								vertical: "middle" as const,
							};
						} else {
							cell.font = { name: "Calibri", size: 7 };
							cell.alignment = {
								horizontal: "center" as const,
								vertical: "middle" as const,
							};
						}

						cell.fill = {
							type: "pattern",
							pattern: "solid",
							fgColor: { argb: rowFill },
						};
						cell.border = headerBorder;
					});
					dataRow.height = 14;
				});

				const columnWidths = [{ width: 15 }];
				for (let i = 0; i < dates.length; i++) {
					columnWidths.push({ width: 5.5 });
				}
				worksheet.columns = columnWidths;
			});

			const buffer = await workbook.xlsx.writeBuffer();
			return buffer.toString("base64");
		}),
});
