import { describe, expect, it } from "vitest";
import { Editor, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  dailyNoteExtensions,
  normalizeEmptyListItemMarkers,
} from "./dailyNoteContent";

describe("normalizeEmptyListItemMarkers", () => {
  it("removes trailing whitespace from an empty bullet item", () => {
    expect(
      normalizeEmptyListItemMarkers("## やること\n- [ ] \n\n## 作業ログ\n- "),
    ).toBe("## やること\n- [ ] \n\n## 作業ログ\n-");
  });

  it("supports every unordered list marker and indentation", () => {
    expect(normalizeEmptyListItemMarkers("- \n  +\t\n\t*  ")).toBe(
      "-\n  +\n\t*",
    );
  });

  it("preserves task items and bullet items with content", () => {
    const markdown = "- [ ] \n- item \n* another item";

    expect(normalizeEmptyListItemMarkers(markdown)).toBe(markdown);
  });

  it("preserves CRLF line endings", () => {
    expect(normalizeEmptyListItemMarkers("- \r\nnext")).toBe("-\r\nnext");
  });

  it("allows Tiptap to parse a trailing empty bullet item as a list", () => {
    const markdown = normalizeEmptyListItemMarkers(
      "## やること\n- [ ] \n\n## 作業ログ\n- ",
    );
    const editor = new Editor({
      content: markdown,
      contentType: "markdown",
      extensions: dailyNoteExtensions(
        Extension,
        StarterKit,
        Markdown,
        TaskList,
        TaskItem,
      ),
    });

    expect(editor.getJSON().content?.at(-1)).toEqual({
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph" }],
        },
      ],
    });

    editor.destroy();
  });
});
