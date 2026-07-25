export type VerticalBounds = {
  top: number;
  bottom: number;
};

export function scrollAdjustmentToRevealStickyNote(
  viewport: VerticalBounds,
  stickyNote: VerticalBounds,
) {
  const viewportHeight = viewport.bottom - viewport.top;
  const stickyNoteHeight = stickyNote.bottom - stickyNote.top;

  if (stickyNoteHeight <= viewportHeight) {
    if (stickyNote.top < viewport.top) {
      return stickyNote.top - viewport.top;
    }

    if (stickyNote.bottom > viewport.bottom) {
      return stickyNote.bottom - viewport.bottom;
    }

    return 0;
  }

  if (stickyNote.bottom <= viewport.top) {
    return stickyNote.bottom - viewport.bottom;
  }

  if (stickyNote.top >= viewport.bottom) {
    return stickyNote.top - viewport.top;
  }

  return 0;
}
