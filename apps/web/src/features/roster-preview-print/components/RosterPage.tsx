import { NURSES_PER_PAGE } from "../constants";
import type { RosterPageProps } from "../types";

export function RosterPage({
	chunk,
	dates,
	monthName,
	pageIdx,
	totalPages,
}: RosterPageProps) {
	return (
		<div
			className="flex h-full flex-col"
			style={{ padding: 0, height: "100%" }}
		>
			{/* Header */}
			<div
				className="roster-header relative mb-2 text-center"
				style={{ flexShrink: 0 }}
			>
				<div
					className="mb-0.5 font-bold"
					style={{
						fontFamily: "var(--font-bengali), 'Noto Sans Bengali', sans-serif",
						fontSize: "16px",
					}}
				>
					উপজেলা স্বাস্থ্য কমপ্লেক্স
				</div>
				<div
					className="mb-0.5 text-slate-600"
					style={{
						fontFamily: "var(--font-bengali), 'Noto Sans Bengali', sans-serif",
						fontSize: "11px",
					}}
				>
					নার্সেস রোস্টার — {monthName}
				</div>
				<div className="absolute top-0 right-0 text-slate-400 text-xs">
					Page {pageIdx + 1} of {totalPages}
				</div>
			</div>

			{/* Table */}
			<div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
				<table
					className="border-collapse text-xs"
					style={{
						tableLayout: "fixed",
						width: "100%",
						borderSpacing: 0,
						fontSize: "11px",
					}}
				>
					<thead>
						<tr style={{ height: "24px" }}>
							<th
								className="border border-slate-400 bg-slate-300 px-1 py-1 text-left font-bold"
								style={{
									width: "50px",
									minWidth: "50px",
									fontSize: "11px",
									paddingLeft: "6px",
								}}
							>
								Name
							</th>
							{dates.map((d) => (
								<th
									key={`h-${d.date}`}
									className="border border-slate-400 bg-slate-300 text-center font-bold leading-tight"
									style={{
										width: "20px",
										minWidth: "20px",
										maxWidth: "20px",
										fontSize: "9px",
										padding: "2px 0",
										height: "24px",
									}}
								>
									<div style={{ lineHeight: "1" }}>{d.dayName}</div>
									<div style={{ lineHeight: "1" }}>{d.date}</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{chunk.map((nurse, idx) => {
							const bgClass = idx % 2 === 1 ? "bg-slate-100" : "bg-white";
							const name = nurse.Name ?? "";

							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: nurse name alone is not guaranteed unique; composite key with idx is safest
								<tr key={`row-${name}-${idx}`} style={{ height: "24px" }}>
									<td
										className={`border border-slate-300 px-1 py-0.5 font-medium ${bgClass}`}
										style={{
											fontFamily:
												"var(--font-bengali), 'Noto Sans Bengali', sans-serif",
											fontSize: "13px",
											lineHeight: "1.2",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
											maxWidth: "60px",
											height: "24px",
											paddingLeft: "6px",
										}}
									>
										{name}
									</td>
									{dates.map((d) => {
										const cellKey = `${d.dayName} ${d.date}`;
										return (
											<td
												key={`cell-${d.date}`}
												className={`border border-slate-300 text-center ${bgClass}`}
												style={{
													width: "20px",
													minWidth: "20px",
													maxWidth: "20px",
													fontSize: "11px",
													padding: "1px 0",
													height: "24px",
												}}
											>
												{nurse[cellKey] ?? ""}
											</td>
										);
									})}
								</tr>
							);
						})}

						{/* Filler rows to maintain consistent page structure */}
						{Array.from({
							length: Math.max(0, NURSES_PER_PAGE - chunk.length),
						}).map((_, fillerIdx) => {
							const fillerRowIndex = chunk.length + fillerIdx;
							const bgClass =
								fillerRowIndex % 2 === 1 ? "bg-slate-100" : "bg-white";

							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: filler rows are anonymous placeholders with no identity
								<tr key={`filler-${fillerIdx}`} style={{ height: "24px" }}>
									<td
										className={`border border-slate-300 ${bgClass}`}
										style={{ height: "24px" }}
									/>
									{dates.map((d) => (
										<td
											key={`filler-cell-${d.date}`}
											className={`border border-slate-300 ${bgClass}`}
											style={{
												width: "20px",
												maxWidth: "20px",
												height: "24px",
											}}
										/>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Legend */}
			<div
				className="roster-legend flex gap-6 text-slate-600"
				style={{ flexShrink: 0, fontSize: "12px", marginTop: "4mm" }}
			>
				<span>
					<strong>M</strong> = Morning
				</span>
				<span>
					<strong>E</strong> = Evening
				</span>
				<span>
					<strong>N</strong> = Night
				</span>
				<span>
					<strong>O</strong> = Off
				</span>
			</div>
		</div>
	);
}
