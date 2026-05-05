"use client";

import { Suspense, useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const ML_API_URL =
	process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:5001";

interface Analytics {
	coverage_score: number;
	fairness_index: number;
	detected_conflicts: number;
	compliance_status: number;
	predicted_issues: number;
	fatigue_risk: string;
	avg_shifts: number;
}

interface NurseData {
	name: string;
	shifts: number;
	efficiency: number;
	fatigue: number;
	predicted: number;
}

interface ShiftDistribution {
	labels: string[];
	data: number[];
	avg: number;
	std_dev: number;
	nurses: { name: string; shifts: number }[];
}

interface FatigueTrend {
	labels: string[];
	series: { name: string; data: number[] }[];
}

interface EfficiencyFatigue {
	data: { name: string; fatigue: number; efficiency: number; shifts: number }[];
	correlation: number;
	insight: string;
}

interface Compliance {
	compliant: number;
	non_compliant: number;
	total: number;
	percentage: number;
	violations: { name: string; shifts: number; excess: number }[];
}

interface WorkloadBalance {
	overworked: string[];
	fair: string[];
	underworked: string[];
	avg_shifts: number;
}

interface PredictionAccuracy {
	data: { name: string; actual: number; predicted: number; accuracy: number }[];
	avg_accuracy: number;
	model_quality: string;
}

interface RiskHeatmap {
	data: {
		name: string;
		fatigue: number;
		efficiency: number;
		risk_level: string;
	}[];
}

function InsightsContent() {
	const [analytics, setAnalytics] = useState<Analytics | null>(null);
	const [nursesData, setNursesData] = useState<NurseData[]>([]);
	const [shiftDist, setShiftDist] = useState<ShiftDistribution | null>(null);
	const [fatigueTrend, setFatigueTrend] = useState<FatigueTrend | null>(null);
	const [effFatigue, setEffFatigue] = useState<EfficiencyFatigue | null>(null);
	const [compliance, setCompliance] = useState<Compliance | null>(null);
	const [workloadBal, setWorkloadBal] = useState<WorkloadBalance | null>(null);
	const [predAccuracy, setPredAccuracy] = useState<PredictionAccuracy | null>(
		null,
	);
	const [riskHeat, setRiskHeat] = useState<RiskHeatmap | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"overview" | "trends" | "staff">(
		"overview",
	);

	const fetchAllData = async () => {
		setIsLoading(true);
		try {
			const [an, nd, sd, ft, ef, comp, wb, pa, rh] = await Promise.all([
				fetch(`${ML_API_URL}/api/analytics`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
				fetch(`${ML_API_URL}/api/nurses`)
					.then((r) => (r.ok ? r.json() : []))
					.catch(() => []),
				fetch(`${ML_API_URL}/api/chart/shift-distribution`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
				fetch(`${ML_API_URL}/api/chart/fatigue-trend`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
				fetch(`${ML_API_URL}/api/chart/efficiency-vs-fatigue`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
				fetch(`${ML_API_URL}/api/chart/shift-compliance`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
				fetch(`${ML_API_URL}/api/chart/workload-balance`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
				fetch(`${ML_API_URL}/api/chart/prediction-accuracy`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
				fetch(`${ML_API_URL}/api/chart/risk-heatmap`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
			]);
			setAnalytics(an);
			setNursesData(nd);
			setShiftDist(sd);
			setFatigueTrend(ft);
			setEffFatigue(ef);
			setCompliance(comp);
			setWorkloadBal(wb);
			setPredAccuracy(pa);
			setRiskHeat(rh);
		} catch (e) {
			console.error("Error fetching data:", e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchAllData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const getRiskColor = (risk: string) => {
		switch (risk) {
			case "low":
				return "bg-green-100 text-green-700";
			case "medium":
				return "bg-yellow-100 text-yellow-700";
			case "high":
				return "bg-red-100 text-red-700";
			default:
				return "bg-gray-100 text-gray-700";
		}
	};

	const getStatusText = (val: number, highIsGood: boolean) => {
		if (highIsGood) {
			if (val >= 90) return "Excellent";
			if (val >= 75) return "Good";
			if (val >= 50) return "Fair";
			return "Needs attention";
		}
		if (val === 0) return "No issues";
		if (val <= 2) return "Minor issues";
		return "Needs attention";
	};

	const getStatusColor = (val: number, highIsGood: boolean) => {
		if (highIsGood) {
			if (val >= 90) return "text-green-600";
			if (val >= 75) return "text-blue-600";
			if (val >= 50) return "text-yellow-600";
			return "text-red-600";
		}
		if (val === 0) return "text-green-600";
		if (val <= 2) return "text-yellow-600";
		return "text-red-600";
	};

	const distributionData = shiftDist
		? shiftDist.labels.map((label, i) => ({
				range: label,
				count: shiftDist.data[i],
			}))
		: [];

	const complianceData = compliance
		? [
				{ name: "Compliant", value: compliance.compliant, color: "#22c55e" },
				{
					name: "Violations",
					value: compliance.non_compliant,
					color: "#ef4444",
				},
			]
		: [];

	const workloadData = workloadBal
		? [
				{
					category: "Overworked",
					count: workloadBal.overworked.length,
					color: "#ef4444",
				},
				{ category: "Fair", count: workloadBal.fair.length, color: "#22c55e" },
				{
					category: "Underworked",
					count: workloadBal.underworked.length,
					color: "#f59e0b",
				},
			]
		: [];

	const fatigueLineData = fatigueTrend
		? fatigueTrend.labels.map((date, i) => {
				const row: Record<string, string | number> = { date };
				fatigueTrend.series.forEach((s) => {
					row[s.name] = s.data[i];
				});
				return row;
			})
		: [];

	const fatigueSeriesColors = [
		"#0f2027",
		"#3b82f6",
		"#8b5cf6",
		"#ec4899",
		"#f59e0b",
		"#22c55e",
	];

	const _renderWorkloadPieLabel = (entry: { category: string; count: number }) =>
		`${entry.category}: ${entry.count}`;

	return (
		<div className="container mx-auto max-w-[1600px] px-5 py-6">
			<header className="mb-6 rounded-2xl bg-white p-6 shadow-lg">
				<h1 className="mb-1 text-2xl text-[#0f2027]">Schedule Analytics</h1>
				<p className="text-gray-500 text-sm">
					Insights into workload distribution, fatigue trends, and staff
					performance
				</p>
			</header>

			<div className="mb-6 flex gap-2">
				<button
					type="button"
					onClick={() => setActiveTab("overview")}
					className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${
						activeTab === "overview"
							? "bg-[#0f2027] text-white"
							: "bg-white text-gray-600 hover:bg-gray-50"
					}`}
				>
					Overview
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("trends")}
					className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${
						activeTab === "trends"
							? "bg-[#0f2027] text-white"
							: "bg-white text-gray-600 hover:bg-gray-50"
					}`}
				>
					Trends
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("staff")}
					className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${
						activeTab === "staff"
							? "bg-[#0f2027] text-white"
							: "bg-white text-gray-600 hover:bg-gray-50"
					}`}
				>
					Staff Details
				</button>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => (
						<div
							key={`skeleton-overview-${i}`}
							className="h-32 animate-pulse rounded-xl bg-slate-200"
						/>
					))}
				</div>
			) : activeTab === "overview" ? (
				<>
					<div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
						<div className="rounded-xl bg-white p-5 shadow-md">
							<div className="mb-1 text-gray-500 text-xs uppercase tracking-wide">
								Coverage
							</div>
							<div className="font-bold text-3xl text-[#0f2027]">
								{analytics?.coverage_score || 0}%
							</div>
							<div
								className={`mt-1 font-medium text-sm ${getStatusColor(analytics?.coverage_score || 0, true)}`}
							>
								{getStatusText(analytics?.coverage_score || 0, true)}
							</div>
							<p className="mt-2 text-gray-400 text-xs leading-snug">
								How well shifts are filled across all positions
							</p>
						</div>

						<div className="rounded-xl bg-white p-5 shadow-md">
							<div className="mb-1 text-gray-500 text-xs uppercase tracking-wide">
								Fairness
							</div>
							<div className="font-bold text-3xl text-[#0f2027]">
								{analytics?.fairness_index || 0}%
							</div>
							<div
								className={`mt-1 font-medium text-sm ${getStatusColor(analytics?.fairness_index || 0, true)}`}
							>
								{getStatusText(analytics?.fairness_index || 0, true)}
							</div>
							<p className="mt-2 text-gray-400 text-xs leading-snug">
								How evenly shifts are distributed among staff
							</p>
						</div>

						<div className="rounded-xl bg-white p-5 shadow-md">
							<div className="mb-1 text-gray-500 text-xs uppercase tracking-wide">
								Conflicts
							</div>
							<div className="font-bold text-3xl text-[#0f2027]">
								{analytics?.detected_conflicts || 0}
							</div>
							<div
								className={`mt-1 font-medium text-sm ${getStatusColor(analytics?.detected_conflicts || 0, false)}`}
							>
								{getStatusText(analytics?.detected_conflicts || 0, false)}
							</div>
							<p className="mt-2 text-gray-400 text-xs leading-snug">
								Staff with scheduling issues or overtime risks
							</p>
						</div>

						<div className="rounded-xl bg-white p-5 shadow-md">
							<div className="mb-1 text-gray-500 text-xs uppercase tracking-wide">
								Fatigue Risk
							</div>
							<div className="font-bold text-3xl text-[#0f2027] capitalize">
								{analytics?.fatigue_risk || "low"}
							</div>
							<div
								className={`mt-1 inline-block rounded px-2 py-0.5 font-medium text-xs ${getRiskColor(analytics?.fatigue_risk || "low")}`}
							>
								{analytics?.fatigue_risk || "low"} risk
							</div>
							<p className="mt-2 text-gray-400 text-xs leading-snug">
								Overall burnout risk based on workload
							</p>
						</div>
					</div>

					<div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
						<div className="rounded-xl bg-white p-5 shadow-md">
							<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
								Shift Distribution
							</h3>
							<p className="mb-3 text-gray-500 text-xs">
								Shows how shifts are spread across nurses. Gaps indicate
								workload imbalance.
							</p>
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={distributionData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
									<XAxis
										dataKey="range"
										tick={{ fontSize: 11 }}
										stroke="#6b7280"
									/>
									<YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
									<Tooltip />
									<Bar dataKey="count" fill="#0f2027" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
							{shiftDist && (
								<div className="mt-2 text-gray-500 text-xs">
									Avg: {shiftDist.avg} shifts | Std Dev: {shiftDist.std_dev}
								</div>
							)}
						</div>

						<div className="rounded-xl bg-white p-5 shadow-md">
							<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
								Workload Balance
							</h3>
							<p className="mb-3 text-gray-500 text-xs">
								Categorizes staff by workload relative to average (
								{workloadBal?.avg_shifts || 0} shifts).
							</p>
							<ResponsiveContainer width="100%" height={200}>
								<PieChart>
									<Pie
										data={workloadData}
										dataKey="count"
										nameKey="category"
										cx="50%"
										cy="50%"
										outerRadius={70}
									>
										{workloadData.map((entry) => (
											<Cell key={entry.category} fill={entry.color} />
										))}
									</Pie>
									<Tooltip />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
							<div className="mt-2 space-y-1">
								{workloadBal && workloadBal.overworked.length > 0 && (
									<div className="text-red-600 text-xs">
										Overworked: {workloadBal.overworked.join(", ")}
									</div>
								)}
								{workloadBal && workloadBal.underworked.length > 0 && (
									<div className="text-xs text-yellow-600">
										Underworked: {workloadBal.underworked.join(", ")}
									</div>
								)}
							</div>
						</div>

						<div className="rounded-xl bg-white p-5 shadow-md">
							<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
								Efficiency vs Fatigue
							</h3>
							<p className="mb-3 text-gray-500 text-xs">
								Correlation: {effFatigue?.correlation || 0} (negative = fatigue
								hurts efficiency)
							</p>
							<ResponsiveContainer width="100%" height={200}>
								<ScatterChart>
									<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
									<XAxis
										dataKey="fatigue"
										name="Fatigue"
										tick={{ fontSize: 11 }}
										stroke="#6b7280"
										domain={[0, 100]}
									/>
									<YAxis
										dataKey="efficiency"
										name="Efficiency"
										tick={{ fontSize: 11 }}
										stroke="#6b7280"
										domain={[0, 100]}
									/>
									<Tooltip cursor={{ strokeDasharray: "3 3" }} />
									<Scatter data={effFatigue?.data || []} fill="#3b82f6">
										{(effFatigue?.data || []).map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={
													entry.fatigue > 75
														? "#ef4444"
														: entry.fatigue > 60
															? "#f59e0b"
															: "#22c55e"
												}
											/>
										))}
									</Scatter>
								</ScatterChart>
							</ResponsiveContainer>
						</div>

						<div className="rounded-xl bg-white p-5 shadow-md">
							<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
								Compliance Status
							</h3>
							<p className="mb-3 text-gray-500 text-xs">
								{compliance?.percentage || 0}% of staff within legal limit (30
								shifts/month)
							</p>
							<ResponsiveContainer width="100%" height={200}>
								<PieChart>
									<Pie
										data={complianceData}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										innerRadius={50}
										outerRadius={70}
										label={({ name, value }) => `${name}: ${value}`}
									>
										{complianceData.map((entry) => (
											<Cell key={entry.name} fill={entry.color} />
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
							{compliance?.violations &&
								compliance.violations.length > 0 && (
									<div className="mt-2 text-red-600 text-xs">
										Violations:{" "}
										{compliance.violations
											.map((v) => `${v.name} (${v.shifts} shifts)`)
											.join(", ")}
									</div>
								)}
						</div>
					</div>

					<div className="rounded-xl bg-white p-5 shadow-md">
						<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
							Key Insights
						</h3>
						<div className="space-y-3">
							{nursesData.filter((n) => n.fatigue > 70).length > 0 && (
								<div className="rounded-r border-yellow-400 border-l-4 bg-yellow-50 p-3">
									<div className="font-medium text-sm text-yellow-800">
										High Fatigue Alert
									</div>
									<div className="mt-1 text-xs text-yellow-700">
										{nursesData
											.filter((n) => n.fatigue > 70)
											.map((n) => n.name)
											.join(", ")}{" "}
										have high fatigue levels
									</div>
								</div>
							)}
							{analytics && analytics.fairness_index < 70 && (
								<div className="rounded-r border-blue-400 border-l-4 bg-blue-50 p-3">
									<div className="font-medium text-blue-800 text-sm">
										Fairness Below Target
									</div>
									<div className="mt-1 text-blue-700 text-xs">
										Shift distribution could be more balanced across staff
									</div>
								</div>
							)}
							{analytics && analytics.detected_conflicts > 0 && (
								<div className="rounded-r border-red-400 border-l-4 bg-red-50 p-3">
									<div className="font-medium text-red-800 text-sm">
										Schedule Conflicts
									</div>
									<div className="mt-1 text-red-700 text-xs">
										{analytics.detected_conflicts} staff have scheduling issues
									</div>
								</div>
							)}
							{predAccuracy && predAccuracy.avg_accuracy < 80 && (
								<div className="rounded-r border-orange-400 border-l-4 bg-orange-50 p-3">
									<div className="font-medium text-orange-800 text-sm">
										Prediction Model Quality
									</div>
									<div className="mt-1 text-orange-700 text-xs">
										Accuracy: {predAccuracy.avg_accuracy}% (
										{predAccuracy.model_quality}). Consider retraining.
									</div>
								</div>
							)}
						</div>
					</div>
				</>
			) : activeTab === "trends" ? (
				<div className="rounded-xl bg-white p-5 shadow-md">
					<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
						Fatigue Trend (30 Days)
					</h3>
					<p className="mb-3 text-gray-500 text-xs">
						Shows predicted fatigue progression over time. Upward trends
						indicate burnout risk.
					</p>
					{fatigueTrend?.series &&
					fatigueTrend.series.length > 0 ? (
						<ResponsiveContainer width="100%" height={400}>
							<LineChart data={fatigueLineData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
								<XAxis
									dataKey="date"
									tick={{ fontSize: 11 }}
									stroke="#6b7280"
								/>
								<YAxis
									domain={[0, 100]}
									tick={{ fontSize: 11 }}
									stroke="#6b7280"
								/>
								<Tooltip />
								<Legend />
								{fatigueTrend.series.map((series, i) => (
									<Line
										key={series.name}
										type="monotone"
										dataKey={series.name}
										stroke={fatigueSeriesColors[i % fatigueSeriesColors.length]}
										strokeWidth={2}
										dot={false}
									/>
								))}
							</LineChart>
						</ResponsiveContainer>
					) : (
						<div className="py-8 text-center text-gray-400">
							No trend data available
						</div>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
					<div className="rounded-xl bg-white p-5 shadow-md">
						<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
							Staff Workload
						</h3>
						{nursesData.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-left text-gray-500 text-xs uppercase">
											<th className="pb-2 font-medium">Name</th>
											<th className="pb-2 font-medium">Shifts</th>
											<th className="pb-2 font-medium">Fatigue</th>
											<th className="pb-2 font-medium">Efficiency</th>
										</tr>
									</thead>
									<tbody>
										{nursesData.map((nurse) => (
											<tr
												key={nurse.name}
												className="border-slate-100 border-t"
											>
												<td className="py-2 text-[#0f2027]">{nurse.name}</td>
												<td className="py-2 text-gray-600">{nurse.shifts}</td>
												<td className="py-2">
													<span
														className={`inline-block rounded px-2 py-0.5 font-medium text-xs ${
															nurse.fatigue > 75
																? "bg-red-100 text-red-700"
																: nurse.fatigue > 60
																	? "bg-yellow-100 text-yellow-700"
																	: "bg-green-100 text-green-700"
														}`}
													>
														{nurse.fatigue}%
													</span>
												</td>
												<td className="py-2 text-gray-600">
													{nurse.efficiency}%
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="py-4 text-center text-gray-400">
								No staff data
							</div>
						)}
					</div>

					<div className="rounded-xl bg-white p-5 shadow-md">
						<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
							Prediction Accuracy
						</h3>
						<p className="mb-3 text-gray-500 text-xs">
							Model accuracy: {predAccuracy?.avg_accuracy || 0}% (
							{predAccuracy?.model_quality || "N/A"})
						</p>
						{predAccuracy?.data &&
						predAccuracy.data.length > 0 ? (
							<ResponsiveContainer width="100%" height={250}>
								<BarChart data={predAccuracy.data} layout="vertical">
									<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
									<XAxis
										type="number"
										domain={[0, 100]}
										tick={{ fontSize: 11 }}
										stroke="#6b7280"
									/>
									<YAxis
										type="category"
										dataKey="name"
										tick={{ fontSize: 11 }}
										stroke="#6b7280"
										width={80}
									/>
									<Tooltip />
									<Bar
										dataKey="accuracy"
										fill="#22c55e"
										radius={[0, 4, 4, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="py-4 text-center text-gray-400">
								No prediction data
							</div>
						)}
					</div>

					<div className="rounded-xl bg-white p-5 shadow-md lg:col-span-2">
						<h3 className="mb-4 font-semibold text-[#0f2027] text-sm">
							Risk Heatmap
						</h3>
						<p className="mb-3 text-gray-500 text-xs">
							Combined risk score based on fatigue, efficiency, and prediction
							accuracy. Red = needs immediate attention.
						</p>
						{riskHeat?.data && riskHeat.data.length > 0 ? (
							<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
								{riskHeat.data.map((staff) => (
									<div
										key={staff.name}
										className={`rounded-lg border p-3 ${
											staff.risk_level === "high"
												? "border-red-200 bg-red-50"
												: staff.risk_level === "medium"
													? "border-yellow-200 bg-yellow-50"
													: "border-green-200 bg-green-50"
										}`}
									>
										<div className="font-medium text-[#0f2027] text-sm">
											{staff.name}
										</div>
										<div className="mt-1 text-gray-500 text-xs">
											Fatigue: {staff.fatigue}% | Eff: {staff.efficiency}%
										</div>
										<div
											className={`mt-1 inline-block rounded px-2 py-0.5 font-medium text-xs ${getRiskColor(staff.risk_level)}`}
										>
											{staff.risk_level}
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="py-4 text-center text-gray-400">No risk data</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function InsightsLoading() {
	return (
		<div className="container mx-auto max-w-[1600px] px-5 py-6">
			<div className="mb-6 h-16 animate-pulse rounded-xl bg-slate-200" />
			<div className="mb-6 grid grid-cols-4 gap-4">
				{[...Array(4)].map((_, i) => (
					<div key={`skeleton-card-${i}`} className="h-32 animate-pulse rounded-xl bg-slate-200" />
				))}
			</div>
			<div className="grid grid-cols-2 gap-5">
				{[...Array(4)].map((_, i) => (
					<div key={`skeleton-chart-${i}`} className="h-48 animate-pulse rounded-xl bg-slate-200" />
				))}
			</div>
		</div>
	);
}

export default function InsightsPage() {
	return (
		<Suspense fallback={<InsightsLoading />}>
			<InsightsContent />
		</Suspense>
	);
}
