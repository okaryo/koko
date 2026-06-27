import { describe, expect, it } from "vitest";
import { markdownFromTiptapJson } from "./markdown";

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
