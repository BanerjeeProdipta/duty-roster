import { cn } from "@Duty-Roster/ui/lib/utils";
import Link from "next/link";
import { ShiftBadge } from "./ShiftBadge";

export function NurseIdentityCell({
  nurse,
  counts,
  pref,
  editable,
}: {
  nurse: { id: string; name: string; active?: boolean };
  counts: { morning: number; evening: number; night: number } | undefined;
  pref?: { morning?: number; evening?: number; night?: number } | undefined;
  editable?: boolean;
}) {
  const totalAssigned =
    (counts?.morning || 0) + (counts?.evening || 0) + (counts?.night || 0);

  const targetWorkedDays =
    (pref?.morning ?? 0) + (pref?.evening ?? 0) + (pref?.night ?? 0);

  const isOverWorked = totalAssigned > targetWorkedDays;
  const isPerfect = totalAssigned === targetWorkedDays;

  return (
    <div
      className={cn(
        "relative h-full w-full border-r border-b bg-white px-3 py-3 transition-colors duration-200 hover:bg-slate-50/80",
        nurse.active === false && "opacity-60 grayscale",
      )}
    >
      <div className="flex h-full flex-col justify-center gap-2">
        <div className="flex items-center justify-between gap-1 overflow-hidden">
          {editable ? (
            <Link href={`/manage-users?q=${nurse.name}`}>
              <span
                className={cn(
                  "cursor-pointer truncate font-extrabold text-blue-900 text-sm hover:text-blue-800 hover:underline",
                )}
                title={nurse.name}
              >
                {nurse?.name || "Nurse"}
              </span>
            </Link>
          ) : (
            <span
              className={cn("truncate font-extrabold text-slate-900 text-sm")}
              title={nurse.name}
            >
              {nurse?.name || "Nurse"}
            </span>
          )}
          <div
            className={cn(
              "shrink-0 rounded-md border px-1.5 py-0.5 font-black text-[9px]",
              isOverWorked
                ? "border-red-200 bg-red-50 text-red-700"
                : isPerfect
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-slate-200 bg-slate-50 text-slate-600",
            )}
            title={`Total assigned: ${totalAssigned} / Goal: ${targetWorkedDays}`}
            suppressHydrationWarning
          >
            {totalAssigned}/{targetWorkedDays}
          </div>
        </div>

        <div className="flex items-center justify-between gap-0.5">
          <ShiftBadge
            count={counts?.morning || 0}
            min={pref?.morning || 0}
            max={pref?.morning || 0}
            shiftType="morning"
          />
          <ShiftBadge
            count={counts?.evening || 0}
            min={pref?.evening || 0}
            max={pref?.evening || 0}
            shiftType="evening"
          />
          <ShiftBadge
            count={counts?.night || 0}
            min={pref?.night || 0}
            max={pref?.night || 0}
            shiftType="night"
          />
        </div>
      </div>
    </div>
  );
}
