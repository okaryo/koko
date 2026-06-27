import { describe, expect, it } from "vitest";
import {
  appCommandFromKeydown,
  dailyNoteCommandFromKeydown,
  pomodoroCommandFromKeydown,
  stickyNoteCommandFromKeydown,
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
      dailyNoteCommandFromKeydown(
        keydown({ key: "c", metaKey: true, shiftKey: true }),
      ),
    ).toBe("copyMarkdown");
    expect(
      dailyNoteCommandFromKeydown(keydown({ key: "t", ctrlKey: true })),
    ).toBe("insertTimestamp");
    expect(
      dailyNoteCommandFromKeydown(
        keydown({ key: "t", metaKey: true, shiftKey: true }),
      ),
    ).toBeNull();
  });

  it("maps StickyNote shortcuts", () => {
    expect(
      stickyNoteCommandFromKeydown(
        keydown({ key: "i", metaKey: true, shiftKey: true }),
      ),
    ).toBe("focusCreate");
    expect(stickyNoteCommandFromKeydown(keydown({ key: "j" }))).toBeNull();
    expect(
      stickyNoteCommandFromKeydown(keydown({ key: "ArrowUp" })),
    ).toBeNull();
    expect(stickyNoteCommandFromKeydown(keydown({ key: "e" }))).toBeNull();
    expect(
      stickyNoteCommandFromKeydown(keydown({ key: "D", shiftKey: true })),
    ).toBeNull();
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
