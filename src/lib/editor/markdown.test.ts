import { describe, expect, it } from "vitest";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { looksLikeMarkdown, markdownFromTiptapJson } from "./markdown";

describe("looksLikeMarkdown", () => {
  it("matches common block markdown", () => {
    expect(looksLikeMarkdown("# Heading")).toBe(true);
    expect(looksLikeMarkdown("- Item")).toBe(true);
    expect(looksLikeMarkdown("1. Item")).toBe(true);
    expect(looksLikeMarkdown("- [ ] Open task")).toBe(true);
    expect(looksLikeMarkdown("> Quote")).toBe(true);
  });

  it("matches common inline markdown", () => {
    expect(looksLikeMarkdown("Ship **koko** today")).toBe(true);
    expect(looksLikeMarkdown("Read [docs](https://example.com)")).toBe(true);
    expect(looksLikeMarkdown("Use `Ctrl+T`")).toBe(true);
  });

  it("does not match ordinary plain text", () => {
    expect(looksLikeMarkdown("Remember to write notes after lunch.")).toBe(
      false,
    );
    expect(looksLikeMarkdown("Line one\nLine two")).toBe(false);
  });
});

describe("Tiptap markdown parsing", () => {
  it("parses pasted markdown into DailyNote editor content", () => {
    const manager = new MarkdownManager({
      extensions: [
        StarterKit,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
      ],
    });

    expect(manager.parse("# Heading\n\n- [x] Done")).toMatchObject({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Heading" }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Done" }],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("markdownFromTiptapJson", () => {
  it("renders paragraphs and inline marks", () => {
    expect(
      markdownFromTiptapJson({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Ship " },
              { type: "text", text: "koko", marks: [{ type: "bold" }] },
            ],
          },
        ],
      }),
    ).toBe("Ship **koko**");
  });

  it("renders bullet and ordered lists", () => {
    expect(
      markdownFromTiptapJson({
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "First" }],
                  },
                ],
              },
            ],
          },
          {
            type: "orderedList",
            attrs: { start: 2 },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Second" }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe("- First\n\n2. Second");
  });

  it("renders task lists with checked state", () => {
    expect(
      markdownFromTiptapJson({
        type: "doc",
        content: [
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Open task" }],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: true },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Done task" }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toBe("- [ ] Open task\n- [x] Done task");
  });
});
