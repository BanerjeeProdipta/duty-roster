const MAX_BAR_HEIGHT = 48;

export function WaveAnimation({ levels }: { levels: number[] }) {
  return (
    <div
      className="flex items-center gap-[3px]"
      style={{ height: MAX_BAR_HEIGHT }}
    >
      {levels.map((level, i) => (
        <div
          key={i}
          className="w-[3px] bg-blue-600 transition-all"
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
  action: string | null;
}

export interface ParsedMessage {
  raw: string;
  showRaw?: boolean;
  command?: ParsedCommand;
}

export function MessageItem({
  message,
  onToggleRaw,
}: {
  message: ParsedMessage;
  onToggleRaw: () => void;
}) {
  const { command, raw, showRaw } = message;
  const isRecognized = !!command;

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={`w-full rounded-2xl px-4 py-3 shadow-sm ${
          isRecognized
            ? "border border-blue-200 bg-blue-50"
            : "border border-gray-200 bg-gray-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <p
            className={`text-xs font-medium uppercase tracking-wider ${
              isRecognized ? "text-blue-500" : "text-gray-400"
            }`}
          >
            {isRecognized ? "Extracted" : "Unrecognized"}
          </p>

          <button
            type="button"
            onClick={onToggleRaw}
            className="text-xs text-gray-400 transition-colors hover:text-gray-600"
          >
            {showRaw ? "Hide transcript" : "Show transcript"}
          </button>
        </div>

        <div className="mt-2 space-y-1 text-sm text-gray-800">
          {isRecognized && command.action && (
            <p>
              <span className="text-gray-500">Action:</span>{" "}
              <span className="font-medium">{command.action}</span>
            </p>
          )}

          {isRecognized && command.nurseName && (
            <p>
              <span className="text-gray-500">Nurse:</span> {command.nurseName}
            </p>
          )}

          {isRecognized && command.shift && (
            <p>
              <span className="text-gray-500">Shift:</span>{" "}
              <span className="font-medium capitalize">{command.shift}</span>
            </p>
          )}

          {isRecognized && command.date && (
            <p>
              <span className="text-gray-500">Date:</span> {command.date}
            </p>
          )}
        </div>

        {showRaw && (
          <div
            className={`mt-3 rounded-xl px-3 py-2 text-xs ${
              isRecognized
                ? "border border-blue-100 bg-white/70 text-gray-500"
                : "bg-white text-gray-600"
            }`}
          >
            {raw}
          </div>
        )}
      </div>
    </div>
  );
}