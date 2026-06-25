import { invoke } from "@tauri-apps/api/core";

export type Pin = {
  id: number;
  body: string;
  createdAtMs: number;
  updatedAtMs: number;
  archivedAtMs: number | null;
};

export function listPins() {
  return invoke<Pin[]>("list_pins");
}

export function createPin(body: string, nowMs: number) {
  return invoke<Pin>("create_pin", { body, nowMs });
}

export function updatePinBody(id: number, body: string, nowMs: number) {
  return invoke<Pin>("update_pin_body", { id, body, nowMs });
}

export function archivePin(id: number, nowMs: number) {
  return invoke<Pin>("archive_pin", { id, nowMs });
}
