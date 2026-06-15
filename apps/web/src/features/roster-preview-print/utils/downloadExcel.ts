import ExcelJS from "exceljs";
import type { DateInfo, NurseRow } from "../types";

const HEADER_FILL: ExcelJS.Fill = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "FFD1D5DB" }, // gray-300
};

const ROW_EVEN_FILL: ExcelJS.Fill = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "FFFFFFFF" },
};

const ROW_ODD_FILL: ExcelJS.Fill = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "FFF3F4F6" }, // gray-100
};

const THIN_BORDER: ExcelJS.Borders = {
	top: { style: "thin", color: { argb: "FFD1D5DB" } },
	left: { style: "thin", color: { argb: "FFD1D5DB" } },
	bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
	right: { style: "thin", color: { argb: "FFD1D5DB" } },
	diagonal: {},
};

function applyBorderAndFill(
	row: ExcelJS.Row,
	fill: ExcelJS.Fill,
	colCount: number,
) {
	for (let c = 1; c <= colCount; c++) {
		const cell = row.getCell(c);
		cell.border = THIN_BORDER;
		cell.fill = fill;
	}
}

export async function downloadExcel(
	nurses: NurseRow[],
	dates: DateInfo[],
	monthName: string,
): Promise<void> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Duty Roster";
	workbook.created = new Date();

	const sheet = workbook.addWorksheet("Roster", {
		pageSetup: {
			paperSize: 9, // A4
			orientation: "landscape",
			fitToPage: true,
			fitToWidth: 1,
			fitToHeight: 0,
		},
	});

	// ── Column definitions ──────────────────────────────────────────────────
	const SUMMARY_COLS = ["M", "E", "N", "O"] as const;
	const totalCols = 3 + dates.length + SUMMARY_COLS.length; // SL + Name + Desig + dates + summary

	sheet.columns = [
		{ header: "SL", key: "sl", width: 4 },
		{ header: "Name", key: "name", width: 22 },
		{ header: "Designation", key: "designation", width: 14 },
		...dates.map((d) => ({
			header: `${d.dayName}\n${d.date}`,
			key: `date_${d.date}`,
			width: 4,
		})),
		...SUMMARY_COLS.map((s) => ({
			header: s,
			key: `sum_${s}`,
			width: 4,
		})),
	];

	// ── Title rows ──────────────────────────────────────────────────────────
	const titleRow1 = sheet.addRow(["উপজেলা স্বাস্থ্য কমপ্লেক্স"]);
	titleRow1.font = { bold: true, size: 13 };
	titleRow1.alignment = { horizontal: "center" };
	sheet.mergeCells(titleRow1.number, 1, titleRow1.number, totalCols);

	const titleRow2 = sheet.addRow([`নার্সেস রোস্টার — ${monthName}`]);
	titleRow2.font = { size: 10, color: { argb: "FF6B7280" } };
	titleRow2.alignment = { horizontal: "center" };
	sheet.mergeCells(titleRow2.number, 1, titleRow2.number, totalCols);

	sheet.addRow([]); // spacer

	// ── Header row ──────────────────────────────────────────────────────────
	const headerValues = [
		"SL",
		"Name",
		"Designation",
		...dates.map((d) => `${d.dayName}\n${d.date}`),
		...SUMMARY_COLS,
	];
	const headerRow = sheet.addRow(headerValues);
	headerRow.height = 28;
	headerRow.font = { bold: true, size: 9 };
	headerRow.alignment = {
		horizontal: "center",
		vertical: "middle",
		wrapText: true,
	};
	applyBorderAndFill(headerRow, HEADER_FILL, totalCols);

	// Freeze panes: freeze the 4 title/header rows + first 3 data columns
	sheet.views = [{ state: "frozen", xSplit: 3, ySplit: headerRow.number }];

	// ── Data rows ───────────────────────────────────────────────────────────
	nurses.forEach((nurse, idx) => {
		const counts: Record<string, number> = { M: 0, E: 0, N: 0, O: 0 };
		for (const d of dates) {
			const v = nurse[`${d.dayName} ${d.date}`];
			if (v === "M" || v === "E" || v === "N" || v === "O") counts[v]++;
		}

		const rowValues = [
			idx + 1,
			nurse.Name ?? "",
			nurse.Designation ?? "",
			...dates.map((d) => nurse[`${d.dayName} ${d.date}`] ?? ""),
			...SUMMARY_COLS.map((s) => counts[s]),
		];

		const dataRow = sheet.addRow(rowValues);
		dataRow.height = 16;
		dataRow.font = { size: 9 };

		const fill = idx % 2 === 0 ? ROW_EVEN_FILL : ROW_ODD_FILL;
		applyBorderAndFill(dataRow, fill, totalCols);

		// Name cell: left-aligned
		dataRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
		dataRow.getCell(3).alignment = { horizontal: "left", vertical: "middle" };

		// Date cells + summary: centred
		for (let c = 4; c <= totalCols; c++) {
			dataRow.getCell(c).alignment = {
				horizontal: "center",
				vertical: "middle",
			};
		}

		// SL cell
		dataRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
	});

	// ── Legend row ──────────────────────────────────────────────────────────
	sheet.addRow([]);
	const legendRow = sheet.addRow([
		"M = Morning   E = Evening   N = Night   O = Off",
	]);
	legendRow.font = { size: 8, color: { argb: "FF6B7280" } };
	sheet.mergeCells(legendRow.number, 1, legendRow.number, totalCols);

	// ── Write & download ────────────────────────────────────────────────────
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `roster-${monthName.replace(/ /g, "-")}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
}
