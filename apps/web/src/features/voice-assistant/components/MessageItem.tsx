import { Bot } from "lucide-react";

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
  onToggleRaw: () => void;
}) {
  const { command, raw, showRaw, isSystem } = message;
  const isRecognized = !!command;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const BotIcon = () => (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
      <Bot className="size-4 text-white" />
    </div>
  );

  if (isSystem) {
    return (
      <div className="mt-4 flex w-full items-start gap-1.5">
        <BotIcon />
        <div className="flex-1 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-gray-800">{raw}</p>
        </div>
      </div>
    );
  }

  if (isRecognized) {
    return (
      <div className="flex w-full items-start gap-3">
        <div className="mt-4 flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-xs uppercase tracking-wider text-emerald-500">
              Extracted
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
            {command.action && (
              <p>
                <span className="text-gray-500">Action:</span> {command.action}
              </p>
            )}

            {command.nurseName && (
              <p>
                <span className="text-gray-500">Nurse:</span>{" "}
                {command.nurseName}
              </p>
            )}

            {command.shift && (
              <p>
                <span className="text-gray-500">Shift:</span> {command.shift}
              </p>
            )}

            {command.date && (
              <p>
                <span className="text-gray-500">Date:</span> {command.date}
              </p>
            )}
          </div>

          {showRaw && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-white/70 px-3 py-2 text-xs text-gray-500">
              {raw}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-3">
      <BotIcon />
      <div className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="mb-2 font-medium text-xs uppercase tracking-wider text-gray-400">
          Unrecognized
        </p>
        {showRaw && (
          <div className="rounded-xl bg-white px-3 py-2 text-xs text-gray-600">
            {raw}
          </div>
        )}
      </div>
    </div>
  );
}
