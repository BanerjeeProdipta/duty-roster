// Types shared across the roster-preview-print feature

export type NurseRow = Record<string, string>;

export interface DateInfo {
	dayName: string;
	date: number;
}

export interface PageData {
	nurses: NurseRow[];
	dates: DateInfo[];
	monthName: string;
}

export interface RosterPageProps {
	chunk: NurseRow[];
	dates: DateInfo[];
	monthName: string;
	pageIdx: number;
	totalPages: number;
}
