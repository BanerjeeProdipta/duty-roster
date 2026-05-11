"use client";

import { Skeleton } from "@Duty-Roster/ui/components/skeleton";

const SKELETON_ROWS = [
  "skel-1",
  "skel-2",
  "skel-3",
  "skel-4",
  "skel-5",
] as const;

export function RosterPrintSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          {SKELETON_ROWS.map((id) => (
            <div key={id} className="flex items-center gap-4">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
