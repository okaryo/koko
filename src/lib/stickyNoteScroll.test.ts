import { describe, expect, it } from "vitest";
import { scrollAdjustmentToRevealStickyNote } from "./stickyNoteScroll";

const viewport = { top: 100, bottom: 500 };

describe("scrollAdjustmentToRevealStickyNote", () => {
  it("does not scroll when the sticky note is fully visible", () => {
    expect(
      scrollAdjustmentToRevealStickyNote(viewport, {
        top: 180,
        bottom: 320,
      }),
    ).toBe(0);
  });

  it("reveals a sticky note clipped above or below the viewport", () => {
    expect(
      scrollAdjustmentToRevealStickyNote(viewport, {
        top: 60,
        bottom: 200,
      }),
    ).toBe(-40);
    expect(
      scrollAdjustmentToRevealStickyNote(viewport, {
        top: 420,
        bottom: 560,
      }),
    ).toBe(60);
  });

  it("does not jump when a tall sticky note already intersects the viewport", () => {
    expect(
      scrollAdjustmentToRevealStickyNote(viewport, {
        top: 80,
        bottom: 600,
      }),
    ).toBe(0);
  });

  it("reveals the nearest edge when a tall sticky note is outside the viewport", () => {
    expect(
      scrollAdjustmentToRevealStickyNote(viewport, {
        top: -500,
        bottom: 80,
      }),
    ).toBe(-420);
    expect(
      scrollAdjustmentToRevealStickyNote(viewport, {
        top: 520,
        bottom: 1100,
      }),
    ).toBe(420);
  });
});
