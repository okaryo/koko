import { describe, expect, it } from "vitest";
import {
  insertMarkdownListContinuation,
  markdownListContinuationForLine,
} from "./textareaMarkdown";

describe("markdownListContinuationForLine", () => {
  it("continues bullet lines with the same indent", () => {
    expect(markdownListContinuationForLine("-")).toBe("- ");
    expect(markdownListContinuationForLine("- Write note")).toBe("- ");
    expect(markdownListContinuationForLine("  - Nested note")).toBe("  - ");
  });

  it("continues task lines as unchecked tasks with the same indent", () => {
    expect(markdownListContinuationForLine("- [ ] Open task")).toBe("- [ ] ");
    expect(markdownListContinuationForLine("- [x] Done task")).toBe("- [ ] ");
    expect(markdownListContinuationForLine("    - [X] Done nested task")).toBe(
      "    - [ ] ",
    );
  });

  it("ignores non-list lines", () => {
    expect(markdownListContinuationForLine("Remember - this")).toBeNull();
    expect(markdownListContinuationForLine("1. Ordered item")).toBeNull();
  });
});

describe("insertMarkdownListContinuation", () => {
  it("inserts a bullet continuation at the end of the current line", () => {
    expect(insertMarkdownListContinuation("- First", 7, 7)).toEqual({
      value: "- First\n- ",
      selectionStart: 10,
      selectionEnd: 10,
    });
  });

  it("preserves text after the insertion point", () => {
    expect(
      insertMarkdownListContinuation("- First\nNext paragraph", 7, 7),
    ).toEqual({
      value: "- First\n- \nNext paragraph",
      selectionStart: 10,
      selectionEnd: 10,
    });
  });

  it("does not edit selected text or lines when the cursor is not at line end", () => {
    expect(insertMarkdownListContinuation("- First", 2, 5)).toBeNull();
    expect(insertMarkdownListContinuation("- First", 2, 2)).toBeNull();
  });
});
