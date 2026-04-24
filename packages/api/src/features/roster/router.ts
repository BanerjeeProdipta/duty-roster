import * as XLSX from "xlsx";

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

	downloadCSV: publicProcedure
		.input(
			z.object({
				startDate: z.string(),
				endDate: z.string(),
			}),
		)
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

			const dates: string[] = [];
			const start = new Date(input.startDate);
			const end = new Date(input.endDate);
			const currentYear = new Date().getFullYear();

			for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
				const day = d.getDate();
				const dayName = d.toLocaleString("en-US", { weekday: "short" });
				dates.push(`${dayName} ${day}`);
			}

			const rosterMonthName = new Date(start).toLocaleString("en-US", {
				month: "long",
				year: "numeric",
			});

			const rows = (schedules?.nurseRows ?? []).map((row) => {
				const rowData: Record<string, string | number> = {
					Name: row.nurse.name,
				};
				for (const date of dates) {
					const dayNumber = date.split(" ")[1];
					const shortMonth = new Date(start).toLocaleString("en-US", {
						month: "short",
					});
					const monthIndex = new Date(`${shortMonth} 1 2024`).getMonth() + 1;
					const dateKey = `${currentYear}-${String(monthIndex).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
					const assignment = row.assignments[dateKey];
					const letter = assignment
						? (shiftLetter[assignment.shiftType] ?? "?")
						: "O";
					rowData[date] = letter;
				}
				return rowData;
			});

			// Split nurses into chunks of 16
			const nurseChunks = [];
			for (let i = 0; i < rows.length; i += 16) {
				nurseChunks.push(rows.slice(i, i + 16));
			}

			const workbook = XLSX.utils.book_new();

			// Create a worksheet for each chunk of nurses
			nurseChunks.forEach((chunkNurses, pageIndex) => {
				// Build header row with dates
				const headerRow = ["Name", ...dates];

				// Build data rows
				const dataRows = chunkNurses.map((nurse) => [
					nurse.Name,
					...dates.map((date) => nurse[date] || ""),
				]);

				const worksheetData = [
					["উপজেলা স্বাস্থ্য কমপ্লেক্স"],
					[rosterMonthName],
					[""],
					headerRow,
					...dataRows,
				];

				const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

				// A4 page setup
				worksheet.pageSetup = {
					paperSize: 9, // A4
					orientation: "landscape",
					fitToPage: false,
				};

				worksheet.pageMargins = {
					left: 0.25,
					right: 0.25,
					top: 0.4,
					bottom: 0.4,
					header: 0.2,
					footer: 0.2,
				};

				// Main title style (row 0)
				const mainTitleStyle = {
					font: { name: "Calibri", sz: 16, b: true },
					alignment: { horizontal: "center", vertical: "center" },
				};

				worksheet.A1 = {
					t: "s",
					v: "উপজেলা স্বাস্থ্য কমপ্লেক্স",
					s: mainTitleStyle,
				};

				// Month name style (row 1)
				const monthStyle = {
					font: { name: "Calibri", sz: 13, b: true },
					alignment: { horizontal: "center", vertical: "center" },
				};

				worksheet.A2 = {
					t: "s",
					v: rosterMonthName,
					s: monthStyle,
				};

				// Merge title rows
				worksheet["!merges"] = [
					{ s: { r: 0, c: 0 }, e: { r: 0, c: dates.length } },
					{ s: { r: 1, c: 0 }, e: { r: 1, c: dates.length } },
				];

				// Header row style (row 3)
				const headerStyle = {
					font: { name: "Calibri", sz: 8, b: true, color: { rgb: "FFFFFF" } },
					fill: { fgColor: { rgb: "4B5563" }, patternType: "solid" },
					alignment: {
						horizontal: "center",
						vertical: "center",
						wrapText: false,
					},
					border: {
						left: { style: "thin", color: { rgb: "000000" } },
						right: { style: "thin", color: { rgb: "000000" } },
						top: { style: "thin", color: { rgb: "000000" } },
						bottom: { style: "thin", color: { rgb: "000000" } },
					},
				};

				for (let c = 0; c <= dates.length; c++) {
					const cellAddr = XLSX.utils.encode_cell({ r: 3, c });
					const headerValue = c === 0 ? "Name" : headerRow[c];
					worksheet[cellAddr] = {
						t: "s",
						v: headerValue,
						s: headerStyle,
					};
				}

				// Name column style (bold)
				const nameStyle = {
					font: { name: "Calibri", sz: 8, b: true },
					alignment: { horizontal: "left", vertical: "center" },
					border: {
						left: { style: "thin", color: { rgb: "000000" } },
						right: { style: "thin", color: { rgb: "000000" } },
						top: { style: "thin", color: { rgb: "D3D3D3" } },
						bottom: { style: "thin", color: { rgb: "D3D3D3" } },
					},
				};

				// Data cell style
				const dataStyle = {
					font: { name: "Calibri", sz: 7 },
					alignment: { horizontal: "center", vertical: "center" },
					border: {
						left: { style: "thin", color: { rgb: "D3D3D3" } },
						right: { style: "thin", color: { rgb: "D3D3D3" } },
						top: { style: "thin", color: { rgb: "D3D3D3" } },
						bottom: { style: "thin", color: { rgb: "D3D3D3" } },
					},
				};

				// Apply styles to all rows
				// Title rows
				for (let c = 0; c <= dates.length; c++) {
					const cell1 = XLSX.utils.encode_cell({ r: 0, c });
					const cell2 = XLSX.utils.encode_cell({ r: 1, c });
					const cell3 = XLSX.utils.encode_cell({ r: 2, c });

					if (!worksheet[cell1]) worksheet[cell1] = { t: "s", v: "" };
					if (!worksheet[cell2]) worksheet[cell2] = { t: "s", v: "" };
					if (!worksheet[cell3]) worksheet[cell3] = { t: "s", v: "" };

					worksheet[cell1].s = mainTitleStyle;
					worksheet[cell2].s = monthStyle;
				}

				// Data rows (starting from row 4)
				for (let r = 4; r < chunkNurses.length + 4; r++) {
					for (let c = 0; c <= dates.length; c++) {
						const cellAddr = XLSX.utils.encode_cell({ r, c });

						if (!worksheet[cellAddr]) {
							worksheet[cellAddr] = { t: "s", v: "" };
						}

						if (c === 0) {
							worksheet[cellAddr].s = nameStyle;
						} else {
							worksheet[cellAddr].s = dataStyle;
						}
					}
				}

				// Column widths (optimized for A4)
				worksheet["!cols"] = [
					{ wch: 15 }, // Name column
					...dates.map(() => ({ wch: 5.5 })), // Compact date columns
				];

				// Row heights
				worksheet["!rows"] = [
					{ hpx: 24 }, // Main title
					{ hpx: 20 }, // Month name
					{ hpx: 4 }, // Spacer
					{ hpx: 18 }, // Header row
					...chunkNurses.map(() => ({ hpx: 14 })), // Data rows
				];

				// Add worksheet to workbook
				const sheetName =
					nurseChunks.length > 1 ? `Roster P${pageIndex + 1}` : "Roster";
				XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
			});

			const xlsxBuffer = XLSX.write(workbook, {
				bookType: "xlsx",
				type: "array",
			});

			return Buffer.from(xlsxBuffer).toString("base64");
		}),
});
