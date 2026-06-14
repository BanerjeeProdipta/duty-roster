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
			style={{ padding: 0, height: "100%", margin: 0 }}
		>
			{/* Header */}
			<div
				className="roster-header relative mb-1 text-center"
				style={{ flexShrink: 0 }}
			>
				<div
					className="font-bold"
					style={{
						fontFamily: "var(--font-bengali), 'Noto Sans Bengali', sans-serif",
						fontSize: "14px",
					}}
				>
					উপজেলা স্বাস্থ্য কমপ্লেক্স
				</div>
				<div
					className="mb-6 text-gray-600"
					style={{
						fontFamily: "var(--font-bengali), 'Noto Sans Bengali', sans-serif",
						fontSize: "10px",
					}}
				>
					নার্সেস রোস্টার — {monthName}
				</div>
				<div className="absolute top-0 right-0 text-gray-400 text-xs">
					Page {pageIdx + 1} of {totalPages}
				</div>
			</div>

			{/* Table */}
			<div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
				<table
					className="border-collapse"
					style={{
						tableLayout: "fixed",
						width: "100%",
						borderSpacing: 0,
						fontSize: "10px",
					}}
				>
					<thead>
						<tr style={{ height: "20px" }}>
							<th
								className="border border-gray-400 bg-gray-300 text-center font-bold"
								style={{
									width: "18px",
									minWidth: "18px",
									maxWidth: "18px",
									fontSize: "9px",
									padding: 0,
								}}
							>
								SL
							</th>

							<th
								className="border border-gray-400 bg-gray-300 px-1 py-1 text-left font-bold"
								style={{
									width: "80px",
									minWidth: "80px",
									fontSize: "9px",
									paddingLeft: "6px",
								}}
							>
								Name
							</th>

							<th
								className="border border-gray-400 bg-gray-300 px-1 py-1 text-left font-bold"
								style={{
									width: "50px",
									minWidth: "50px",
									fontSize: "9px",
									paddingLeft: "6px",
								}}
							>
								Designation
							</th>

							{dates.map((d) => (
								<th
									key={`h-${d.date}`}
									className="border border-gray-400 bg-gray-300 text-center font-bold leading-tight"
									style={{
										width: "16px",
										minWidth: "16px",
										maxWidth: "16px",
										fontSize: "7px",
										padding: "1px 0",
										height: "20px",
									}}
								>
									<div style={{ lineHeight: "1" }}>{d.dayName}</div>
									<div style={{ lineHeight: "1" }}>{d.date}</div>
								</th>
							))}

							{(["M", "E", "N", "O"] as const).map((s) => (
								<th
									key={`hdr-${s}`}
									className="border border-gray-400 bg-gray-300 text-center font-bold"
									style={{
										width: "16px",
										minWidth: "16px",
										maxWidth: "16px",
										fontSize: "8px",
										padding: 0,
										height: "20px",
									}}
								>
									{s}
								</th>
							))}
						</tr>
					</thead>

					<tbody>
						{chunk.map((nurse, idx) => {
							const bgClass = idx % 2 === 1 ? "bg-gray-100" : "bg-white";
							const name = nurse.Name ?? "";
							const serial = pageIdx * NURSES_PER_PAGE + idx + 1;

							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: nurse name alone is not guaranteed unique; composite key with idx is safest
								<tr key={`row-${name}-${idx}`} style={{ height: "20px" }}>
									<td
										className={`border border-gray-300 text-center ${bgClass}`}
										style={{
											width: "8px",
											minWidth: "8px",
											maxWidth: "8px",
											fontSize: "9px",
											padding: "0 2px",
											height: "20px",
										}}
									>
										{serial}
									</td>

									<td
										className={`border border-gray-300 font-medium ${bgClass}`}
										style={{
											fontFamily:
												"var(--font-bengali), 'Noto Sans Bengali', sans-serif",
											fontSize: "11px",
											lineHeight: "1.1",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
											width: "140px",
											minWidth: "140px",
											height: "20px",
											padding: "1px 6px",
										}}
									>
										{name}
									</td>

									<td
										className={`border border-gray-300 text-gray-900 ${bgClass}`}
										style={{
											fontSize: "9px",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
											width: "50px",
											minWidth: "50px",
											height: "20px",
											padding: "1px 6px",
										}}
									>
										{nurse.Designation ?? ""}
									</td>

									{dates.map((d) => {
										const cellKey = `${d.dayName} ${d.date}`;
										return (
											<td
												key={`cell-${d.date}`}
												className={`border border-gray-300 text-center ${bgClass}`}
												style={{
													width: "16px",
													minWidth: "16px",
													maxWidth: "16px",
													fontSize: "9px",
													padding: 0,
													height: "20px",
												}}
											>
												{nurse[cellKey] ?? ""}
											</td>
										);
									})}

									{(() => {
										const c: Record<string, number> = {
											M: 0,
											E: 0,
											N: 0,
											O: 0,
										};
										for (const d of dates) {
											const v = nurse[`${d.dayName} ${d.date}`];
											if (v === "M" || v === "E" || v === "N" || v === "O")
												c[v]++;
										}
										return (["M", "E", "N", "O"] as const).map((s) => (
											<td
												key={`cnt-${s}`}
												className={`border border-gray-300 text-center ${bgClass}`}
												style={{
													width: "16px",
													minWidth: "16px",
													maxWidth: "16px",
													fontSize: "9px",
													padding: 0,
													height: "20px",
												}}
											>
												{c[s]}
											</td>
										));
									})()}
								</tr>
							);
						})}

						{/* Filler rows to maintain consistent page structure */}
						{Array.from({
							length: Math.max(0, NURSES_PER_PAGE - chunk.length),
						}).map((_, fillerIdx) => {
							const fillerRowIndex = chunk.length + fillerIdx;
							const bgClass =
								fillerRowIndex % 2 === 1 ? "bg-gray-100" : "bg-white";

							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: filler rows are anonymous placeholders with no identity
								<tr key={`filler-${fillerIdx}`} style={{ height: "20px" }}>
									<td
										className={`border border-gray-300 ${bgClass}`}
										style={{ height: "20px", width: "8px", minWidth: "8px" }}
									/>
									<td
										className={`border border-gray-300 ${bgClass}`}
										style={{
											height: "20px",
											width: "140px",
											minWidth: "140px",
										}}
									/>
									<td
										className={`border border-gray-300 ${bgClass}`}
										style={{ height: "20px", width: "90px", minWidth: "90px" }}
									/>
									{dates.map((d) => (
										<td
											key={`filler-cell-${d.date}`}
											className={`border border-gray-300 ${bgClass}`}
											style={{
												width: "16px",
												maxWidth: "16px",
												height: "20px",
											}}
										/>
									))}
									<td
										key="filler-cnt-M"
										className={`border border-gray-300 ${bgClass}`}
										style={{ width: "16px", maxWidth: "16px", height: "20px" }}
									/>
									<td
										key="filler-cnt-E"
										className={`border border-gray-300 ${bgClass}`}
										style={{ width: "16px", maxWidth: "16px", height: "20px" }}
									/>
									<td
										key="filler-cnt-N"
										className={`border border-gray-300 ${bgClass}`}
										style={{ width: "16px", maxWidth: "16px", height: "20px" }}
									/>
									<td
										key="filler-cnt-O"
										className={`border border-gray-300 ${bgClass}`}
										style={{ width: "16px", maxWidth: "16px", height: "20px" }}
									/>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Legend */}
			<div
				className="roster-legend flex gap-3 text-gray-600"
				style={{ flexShrink: 0, fontSize: "9px", marginTop: "2mm" }}
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
