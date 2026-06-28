import { describe, expect, it } from "vitest";
import {
  shortcutFromKeydown,
  shortcutToDisplayKeys,
  type ShortcutKeydownEvent,
} from "$lib/globalShortcut";

function key(overrides: Partial<ShortcutKeydownEvent>): ShortcutKeydownEvent {
  return {
    key: "",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  };
}

describe("shortcutFromKeydown", () => {
  it("captures CommandOrControl shortcuts from Command keydown events", () => {
    expect(
      shortcutFromKeydown(key({ key: "L", metaKey: true, shiftKey: true })),
    ).toEqual({
      status: "captured",
      shortcut: "CommandOrControl+Shift+L",
    });
  });

  it("waits while the user is pressing modifier keys", () => {
    expect(shortcutFromKeydown(key({ key: "Meta", metaKey: true }))).toEqual({
      status: "pending",
    });
  });

  it("requires Command, Control, or Option", () => {
    expect(shortcutFromKeydown(key({ key: "L", shiftKey: true }))).toEqual({
      status: "invalid",
      message: "Use Command, Control, or Option with another key.",
    });
  });

  it("rejects shortcuts already used by koko", () => {
    expect(
      shortcutFromKeydown(key({ key: "P", metaKey: true, shiftKey: true })),
    ).toEqual({
      status: "invalid",
      message: "That shortcut is already used by koko.",
    });
  });
});

describe("shortcutToDisplayKeys", () => {
  it("maps stored shortcut names to keyboard labels", () => {
    expect(shortcutToDisplayKeys("CommandOrControl+Shift+L")).toEqual([
      "Cmd",
      "Shift",
      "L",
    ]);
  });
});
