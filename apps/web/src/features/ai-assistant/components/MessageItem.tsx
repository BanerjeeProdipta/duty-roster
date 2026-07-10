import {
	Bot,
	Calendar,
	ChevronDown,
	ChevronUp,
	Clock,
	Coffee,
	Moon,
	Sun,
	Sunset,
	User,
} from "lucide-react";

const MAX_BAR_HEIGHT = 48;

const BotIcon = () => (
	<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-primary">
		<Bot className="size-4 text-white" />
	</div>
);

const UserIcon = () => (
	<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
		<User className="size-4 text-white" />
	</div>
);

export function ProcessingIndicator() {
	return (
		<div className="flex items-center gap-1.5">
			<div className="flex items-center gap-1">
				<span className="size-1.5 animate-bounce rounded-full bg-accent-primary [animation-delay:0ms]" />
				<span className="size-1.5 animate-bounce rounded-full bg-accent-primary [animation-delay:150ms]" />
				<span className="size-1.5 animate-bounce rounded-full bg-accent-primary [animation-delay:300ms]" />
			</div>
		</div>
	);
}

export function WaveAnimation({ levels }: { levels: number[] }) {
	return (
		<div
			className="flex items-center gap-[3px]"
			style={{ height: MAX_BAR_HEIGHT }}
		>
			{levels.map((level, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: audio bar levels array is static and never reordered
					key={i}
					className="w-[3px] bg-accent-primary transition-all"
					style={{
						height: `${Math.max(4, level * MAX_BAR_HEIGHT)}px`,
						transitionDuration: "0.05s",
						transitionTimingFunction: "ease-out",
					}}
				/>
			))}
		</div>
	);
}

interface ParsedCommand {
	shift: string | null;
	date: string | null;
	nurseName: string | null;
	englishName: string | null;
	action: string | null;
	missingFields: string[];
}

export interface ParsedMessage {
	raw: string;
	showRaw?: boolean;
	command?: ParsedCommand;
	isSystem?: boolean;
	isUser?: boolean;
}

export function MessageItem({
	message,
	onToggleRaw,
}: {
	message: ParsedMessage;
	onToggleRaw?: () => void;
}) {
	const { command, raw, showRaw, isSystem } = message;
	const isRecognized = !!command;

	if (isSystem) {
		return (
			<div className="mt-4 flex w-full items-start gap-1.5">
				<BotIcon />
				<div className="flex-1 rounded-2xl border border-accent-primary bg-accent-primary/10 px-4 py-3">
					<p className="text-gray-800 text-sm">{raw}</p>
				</div>
			</div>
		);
	}

	if (isRecognized) {
		const SHIFT_STYLES: Record<string, string> = {
			morning:
				"bg-gradient-to-br from-amber-100 to-amber-300 text-amber-900 border-amber-300 shadow-amber-200/50",
			evening:
				"bg-gradient-to-br from-blue-200 to-blue-300 text-blue-900 border-blue-200 shadow-blue-200/50",
			night:
				"bg-gradient-to-br from-violet-200 to-violet-300 text-violet-900 border-violet-300 shadow-violet-300/50",
			off: "bg-gray-50 text-gray-400 border-gray-100 ring-1 ring-gray-100/50",
		};

		const shiftIcon = (shift: string) => {
			console.log("Determining icon for shift:", shift);
			switch (shift.toLowerCase()) {
				case "morning":
					return <Sun className="size-4" />;
				case "evening":
					return <Sunset className="size-4" />;
				case "night":
					return <Moon className="size-4" />;
				case "off":
					return <Coffee className="size-4" />;
				default:
					return <Clock className="size-4" />;
			}
		};

		const getActionColor = (action: string) => {
			switch (action.toLowerCase()) {
				case "add":
				case "create":
					return "bg-emerald-500";
				case "remove":
				case "delete":
					return "bg-rose-500";
				case "update":
				case "edit":
					return "bg-blue-500";
				default:
					return "bg-slate-400";
			}
		};

		const getShiftStyle = (shift: string) => {
			return SHIFT_STYLES[shift.toLowerCase()] || SHIFT_STYLES.off;
		};

		return (
			<div className="flex w-full items-start gap-3">
				<div className="relative mt-4 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
					{/* Action Banner */}
					{command.action && (
						<div
							className={`${getActionColor(
								command.action,
							)} flex items-center justify-between px-4 py-1`}
						>
							{command.date && (
								<div className="flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-sm text-white">
									<Calendar className="size-4" />
									<span>{command.date}</span>
								</div>
							)}
							<div className="flex items-center gap-2">
								{onToggleRaw && (
									<button
										type="button"
										onClick={onToggleRaw}
										className="flex shrink-0 items-center justify-center rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
									>
										{showRaw ? (
											<ChevronUp className="size-3.5" />
										) : (
											<ChevronDown className="size-3.5" />
										)}
									</button>
								)}
							</div>
						</div>
					)}

					{!command.action && command.date && (
						<div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 font-medium text-gray-700 text-xs">
							<Calendar className="size-3.5" />
							<span>{command.date}</span>
						</div>
					)}
					<div className="px-4 py-3">
						{/* Nurse + Shift Row */}
						<div className="flex items-center justify-between">
							{command.nurseName && (
								<div className="flex items-center gap-2">
									<UserIcon />
									<span className="font-bold text-base text-gray-900">
										{command.nurseName}
									</span>
								</div>
							)}
							{command.shift && (
								<div
									className={`${getShiftStyle(
										command.shift,
									)} inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium text-xs shadow-sm`}
								>
									{shiftIcon(command.shift)}
									<span className="capitalize">{command.shift}</span>
								</div>
							)}
						</div>
					</div>
					{/* Raw Message */}
					{showRaw && (
						<div className="border-gray-100 border-t bg-gray-50 px-4 py-2.5">
							<span className="text-gray-500 text-xs">Original message:</span>
							<div className="mt-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 font-mono text-gray-600 text-xs">
								{raw}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="mt-4 flex w-full items-start gap-1.5">
			<div className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
				<p className="text-gray-800 text-sm">{raw}</p>
			</div>
			<UserIcon />
		</div>
	);
}
