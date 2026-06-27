import { describe, expect, it } from "vitest";
import {
  appCommandFromKeydown,
  dailyNoteCommandFromKeydown,
  pinCommandFromKeydown,
  pomodoroCommandFromKeydown,
} from "./keyboard";

type KeyOptions = Partial<KeyboardEvent> & {
  key: string;
};

function keydown(options: KeyOptions) {
  return {
    metaKey: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    ...options,
  } as KeyboardEvent;
}

describe("keyboard shortcuts", () => {
  it("maps Pomodoro app-wide shortcuts", () => {
    expect(
      pomodoroCommandFromKeydown(
        keydown({ key: "p", metaKey: true, shiftKey: true }),
      ),
    ).toBe("toggle");
    expect(
      pomodoroCommandFromKeydown(
        keydown({ key: "r", metaKey: true, shiftKey: true }),
      ),
    ).toBe("reset");
    expect(pomodoroCommandFromKeydown(keydown({ key: "p" }))).toBeNull();
  });

  it("maps DailyNote shortcuts", () => {
    expect(
      dailyNoteCommandFromKeydown(
        keydown({ key: "n", metaKey: true, shiftKey: true }),
      ),
    ).toBe("focus");
    expect(
      dailyNoteCommandFromKeydown(keydown({ key: "t", ctrlKey: true })),
    ).toBe("insertTimestamp");
    expect(
      dailyNoteCommandFromKeydown(
        keydown({ key: "t", metaKey: true, shiftKey: true }),
      ),
    ).toBeNull();
  });

  it("maps Pin shortcuts", () => {
    expect(
      pinCommandFromKeydown(
        keydown({ key: "i", metaKey: true, shiftKey: true }),
      ),
    ).toBe("focusCreate");
    expect(pinCommandFromKeydown(keydown({ key: "j" }))).toBe("moveDown");
    expect(pinCommandFromKeydown(keydown({ key: "ArrowUp" }))).toBe("moveUp");
    expect(pinCommandFromKeydown(keydown({ key: "e" }))).toBe("editSelected");
    expect(pinCommandFromKeydown(keydown({ key: "D", shiftKey: true }))).toBe(
      "archiveSelected",
    );
  });

  it("maps app shortcuts", () => {
    expect(appCommandFromKeydown(keydown({ key: "/", metaKey: true }))).toBe(
      "toggleKeyboardHelp",
    );
    expect(
      appCommandFromKeydown(
        keydown({ key: "/", metaKey: true, shiftKey: true }),
      ),
    ).toBeNull();
  });
});
