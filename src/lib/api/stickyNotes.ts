import { invoke } from "@tauri-apps/api/core";

export type StickyNote = {
  id: number;
  body: string;
  createdAtMs: number;
  updatedAtMs: number;
  archivedAtMs: number | null;
};

export function listStickyNotes() {
  return invoke<StickyNote[]>("list_sticky_notes");
}

export function createStickyNote(body: string, nowMs: number) {
  return invoke<StickyNote>("create_sticky_note", { body, nowMs });
}

export function updateStickyNoteBody(id: number, body: string, nowMs: number) {
  return invoke<StickyNote>("update_sticky_note_body", { id, body, nowMs });
}

export function archiveStickyNote(id: number, nowMs: number) {
  return invoke<StickyNote>("archive_sticky_note", { id, nowMs });
}
