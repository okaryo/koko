import { describe, expect, it } from "vitest";
import type { StickyNote } from "$lib/api/stickyNotes";
import {
  compareStickyNotes,
  stickyNotesInGroup,
  targetPositionForDrop,
  targetPositionForKeyboardMove,
} from "./stickyNoteOrder";

function stickyNote(id: number, position: number, pinned = false): StickyNote {
  return {
    id,
    body: `Note ${id}`,
    createdAtMs: id,
    updatedAtMs: id,
    pinnedAtMs: pinned ? id : null,
    position,
    archivedAtMs: null,
  };
}

describe("StickyNote ordering", () => {
  it("sorts pinned notes first and then by group position", () => {
    const stickyNotes = [
      stickyNote(1, 1),
      stickyNote(2, 1, true),
      stickyNote(3, 0),
      stickyNote(4, 0, true),
    ];

    expect(
      [...stickyNotes].sort(compareStickyNotes).map(({ id }) => id),
    ).toEqual([4, 2, 3, 1]);
    expect(
      stickyNotesInGroup(stickyNotes, "unpinned").map(({ id }) => id),
    ).toEqual([3, 1]);
  });

  it("calculates keyboard moves within a group and stops at its boundaries", () => {
    const stickyNotes = [
      stickyNote(1, 0, true),
      stickyNote(2, 1, true),
      stickyNote(3, 0),
    ];

    expect(targetPositionForKeyboardMove(stickyNotes, 1, "up")).toBeNull();
    expect(targetPositionForKeyboardMove(stickyNotes, 1, "down")).toBe(1);
    expect(targetPositionForKeyboardMove(stickyNotes, 2, "up")).toBe(0);
    expect(targetPositionForKeyboardMove(stickyNotes, 2, "down")).toBeNull();
    expect(targetPositionForKeyboardMove(stickyNotes, 3, "up")).toBeNull();
  });

  it("calculates before and after drops without counting the dragged note twice", () => {
    const first = stickyNote(1, 0);
    const second = stickyNote(2, 1);
    const third = stickyNote(3, 2);

    expect(targetPositionForDrop(first, third, false)).toBe(1);
    expect(targetPositionForDrop(first, third, true)).toBe(2);
    expect(targetPositionForDrop(third, first, false)).toBe(0);
    expect(targetPositionForDrop(third, first, true)).toBe(1);
    expect(targetPositionForDrop(second, second, false)).toBe(1);
  });

  it("rejects drops across pin groups", () => {
    const pinned = stickyNote(1, 0, true);
    const unpinned = stickyNote(2, 0);

    expect(targetPositionForDrop(pinned, unpinned, false)).toBeNull();
    expect(targetPositionForDrop(unpinned, pinned, true)).toBeNull();
  });
});
