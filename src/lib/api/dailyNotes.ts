import { invoke } from "@tauri-apps/api/core";

export type DailyNote = {
  id: number;
  noteDate: string;
  bodyHtml: string;
  createdAtMs: number;
  updatedAtMs: number;
};

export type DailyNoteNavigation = {
  previousNoteDate: string | null;
  nextNoteDate: string | null;
};

export function getOrCreateDailyNote(
  noteDate: string,
  initialBodyHtml: string,
  nowMs: number,
) {
  return invoke<DailyNote>("get_or_create_daily_note", {
    noteDate,
    initialBodyHtml,
    nowMs,
  });
}

export function getDailyNote(noteDate: string) {
  return invoke<DailyNote | null>("get_daily_note", {
    noteDate,
  });
}

export function getDailyNoteNavigation(noteDate: string) {
  return invoke<DailyNoteNavigation>("get_daily_note_navigation", {
    noteDate,
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
