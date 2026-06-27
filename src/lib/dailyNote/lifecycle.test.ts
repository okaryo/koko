import { describe, expect, it } from "vitest";
import { canStartTodayNote } from "./lifecycle";

describe("DailyNote lifecycle", () => {
  it("allows starting today's note when the current date is after the active note date", () => {
    expect(canStartTodayNote("2026-06-26", "2026-06-27")).toBe(true);
  });

  it("does not allow starting today's note for the active date", () => {
    expect(canStartTodayNote("2026-06-27", "2026-06-27")).toBe(false);
  });

  it("does not allow moving backward to an earlier current date", () => {
    expect(canStartTodayNote("2026-06-28", "2026-06-27")).toBe(false);
  });
});
