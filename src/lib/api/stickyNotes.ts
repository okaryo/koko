import { invoke } from "@tauri-apps/api/core";

export type StickyNoteColor = "yellow" | "pink" | "blue" | "green";

export type StickyNote = {
  id: number;
  body: string;
  color: StickyNoteColor;
  createdAtMs: number;
  updatedAtMs: number;
  pinnedAtMs: number | null;
  position: number;
  archivedAtMs: number | null;
};

export function listStickyNotes() {
  return invoke<StickyNote[]>("list_sticky_notes");
}

export function createStickyNote(body: string, nowMs: number) {
  return invoke<StickyNote[]>("create_sticky_note", { body, nowMs });
}

export function updateStickyNoteBody(id: number, body: string, nowMs: number) {
  return invoke<StickyNote>("update_sticky_note_body", { id, body, nowMs });
}

export function updateStickyNoteColor(
  id: number,
  color: StickyNoteColor,
  nowMs: number,
) {
  return invoke<StickyNote>("update_sticky_note_color", { id, color, nowMs });
}

export function archiveStickyNote(id: number, nowMs: number) {
  return invoke<StickyNote[]>("archive_sticky_note", { id, nowMs });
}

export function pinStickyNote(id: number, nowMs: number) {
  return invoke<StickyNote[]>("pin_sticky_note", { id, nowMs });
}

export function unpinStickyNote(id: number, nowMs: number) {
  return invoke<StickyNote[]>("unpin_sticky_note", { id, nowMs });
}

export function reorderStickyNote(id: number, targetPosition: number) {
  return invoke<StickyNote[]>("reorder_sticky_note", {
    id,
    targetPosition,
  });
}
