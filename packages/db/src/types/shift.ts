export const SHIFT_VALUES = ["morning", "evening", "night"] as const;
export type ShiftKey = (typeof SHIFT_VALUES)[number];
export const OFF_VALUE = "off" as const;
export type OffValue = typeof OFF_VALUE;
export type ShiftWithOff = ShiftKey | OffValue;
export type ShiftProportions = Record<ShiftKey, number>;
export type Assignment = { id: string; shiftType: ShiftWithOff } | null;
