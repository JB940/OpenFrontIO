import z from "zod";

export const ReplaySpeedMultiplierSchema = z.enum({
  Slow: 2,
  Normal: 1,
  Fast: 0.5,
  Fastest: 0,
});

export type ReplaySpeedMultiplier = z.infer<typeof ReplaySpeedMultiplierSchema>;

export const defaultReplaySpeedMultiplier =
  ReplaySpeedMultiplierSchema.enum.Normal;
