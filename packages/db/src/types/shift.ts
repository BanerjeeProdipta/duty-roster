export const SHIFT_VALUES = ["morning", "evening", "night"] as const;
export type ShiftKey = (typeof SHIFT_VALUES)[number];
export type ShiftProportions = Record<ShiftKey, number>;
