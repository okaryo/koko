import type { StickyNote } from "$lib/api/stickyNotes";

export type StickyNoteGroup = "pinned" | "unpinned";
export type StickyNoteMoveDirection = "up" | "down";
export type StickyNoteDropEdge = "top" | "bottom";

export function stickyNoteGroup(stickyNote: StickyNote): StickyNoteGroup {
  return stickyNote.pinnedAtMs === null ? "unpinned" : "pinned";
}

export function compareStickyNotes(a: StickyNote, b: StickyNote) {
  const aGroup = stickyNoteGroup(a);
  const bGroup = stickyNoteGroup(b);

  if (aGroup !== bGroup) {
    return aGroup === "pinned" ? -1 : 1;
  }

  if (a.position !== b.position) {
    return a.position - b.position;
  }

  return a.id - b.id;
}

export function stickyNotesInGroup(
  stickyNotes: StickyNote[],
  group: StickyNoteGroup,
) {
  return stickyNotes
    .filter((stickyNote) => stickyNoteGroup(stickyNote) === group)
    .sort(compareStickyNotes);
}

export function targetPositionForKeyboardMove(
  stickyNotes: StickyNote[],
  id: number,
  direction: StickyNoteMoveDirection,
) {
  const stickyNote = stickyNotes.find((candidate) => candidate.id === id);

  if (!stickyNote) {
    return null;
  }

  const groupStickyNotes = stickyNotesInGroup(
    stickyNotes,
    stickyNoteGroup(stickyNote),
  );
  const currentIndex = groupStickyNotes.findIndex(
    (candidate) => candidate.id === id,
  );
  const targetIndex = currentIndex + (direction === "up" ? -1 : 1);

  if (targetIndex < 0 || targetIndex >= groupStickyNotes.length) {
    return null;
  }

  return targetIndex;
}

export function targetPositionForDrop(
  draggedStickyNote: StickyNote,
  targetStickyNote: StickyNote,
  dropAfter: boolean,
) {
  if (
    stickyNoteGroup(draggedStickyNote) !== stickyNoteGroup(targetStickyNote)
  ) {
    return null;
  }

  let targetPosition = targetStickyNote.position + (dropAfter ? 1 : 0);

  if (draggedStickyNote.position < targetPosition) {
    targetPosition -= 1;
  }

  return targetPosition;
}

export function targetPositionForDropEdge(
  draggedStickyNote: StickyNote,
  targetStickyNote: StickyNote,
  edge: StickyNoteDropEdge,
) {
  return targetPositionForDrop(
    draggedStickyNote,
    targetStickyNote,
    edge === "bottom",
  );
}

export function reorderStickyNotesOptimistically(
  stickyNotes: StickyNote[],
  id: number,
  targetPosition: number,
) {
  const stickyNote = stickyNotes.find((candidate) => candidate.id === id);

  if (!stickyNote) {
    return stickyNotes;
  }

  const group = stickyNoteGroup(stickyNote);
  const groupStickyNotes = stickyNotesInGroup(stickyNotes, group);
  const currentPosition = groupStickyNotes.findIndex(
    (candidate) => candidate.id === id,
  );
  const nextPosition = Math.max(
    0,
    Math.min(targetPosition, groupStickyNotes.length - 1),
  );

  if (currentPosition === nextPosition) {
    return stickyNotes;
  }

  const reorderedGroup = groupStickyNotes.filter(
    (candidate) => candidate.id !== id,
  );
  reorderedGroup.splice(nextPosition, 0, stickyNote);
  const positions = new Map(
    reorderedGroup.map((candidate, position) => [candidate.id, position]),
  );

  return stickyNotes
    .map((candidate) => {
      const position = positions.get(candidate.id);

      return position === undefined ? candidate : { ...candidate, position };
    })
    .sort(compareStickyNotes);
}
