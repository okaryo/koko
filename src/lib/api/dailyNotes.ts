import { invoke } from "@tauri-apps/api/core";

export type DailyNote = {
  id: number;
  noteDate: string;
  bodyHtml: string;
  createdAtMs: number;
  updatedAtMs: number;
};

export function getOrCreateDailyNote(noteDate: string, nowMs: number) {
  return invoke<DailyNote>("get_or_create_daily_note", {
    noteDate,
    nowMs,
  });
}

export function updateDailyNoteBody(
  id: number,
  bodyHtml: string,
  updatedAtMs: number,
) {
  return invoke<DailyNote>("update_daily_note_body", {
    id,
    bodyHtml,
    updatedAtMs,
  });
}
