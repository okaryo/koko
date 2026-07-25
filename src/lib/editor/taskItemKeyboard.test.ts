import { Editor } from "@tiptap/core";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { deleteEmptyTaskItemBackward } from "./taskItemKeyboard";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("deleteEmptyTaskItemBackward", () => {
  it("removes an empty task item and places the cursor at the previous task end", () => {
    editor = createTaskEditor(["a", "b", "", "d"]);
    selectTaskStart(editor, 2);

    expect(editor.commands.command(deleteEmptyTaskItemBackward)).toBe(true);
    expect(taskTexts(editor)).toEqual(["a", "b", "d"]);
    expect(editor.state.selection.$from.parent.textContent).toBe("b");
    expect(editor.state.selection.$from.parentOffset).toBe(1);
  });

  it("removes an empty final task item", () => {
    editor = createTaskEditor(["a", ""]);
    selectTaskStart(editor, 1);

    expect(editor.commands.command(deleteEmptyTaskItemBackward)).toBe(true);
    expect(taskTexts(editor)).toEqual(["a"]);
    expect(editor.state.selection.$from.parent.textContent).toBe("a");
  });

  it("leaves the first empty task item to the default Backspace behavior", () => {
    editor = createTaskEditor(["", "b"]);
    selectTaskStart(editor, 0);

    expect(editor.commands.command(deleteEmptyTaskItemBackward)).toBe(false);
    expect(taskTexts(editor)).toEqual(["", "b"]);
  });

  it("leaves a non-empty task item to the default Backspace behavior", () => {
    editor = createTaskEditor(["a", "b"]);
    selectTaskStart(editor, 1);

    expect(editor.commands.command(deleteEmptyTaskItemBackward)).toBe(false);
    expect(taskTexts(editor)).toEqual(["a", "b"]);
  });
});

function createTaskEditor(texts: string[]) {
  return new Editor({
    content: {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: texts.map((text) => ({
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: text ? [{ type: "text", text }] : undefined,
              },
            ],
          })),
        },
      ],
    },
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
  });
}

function selectTaskStart(targetEditor: Editor, taskIndex: number) {
  let currentTaskIndex = 0;
  let selectionPosition: number | null = null;

  targetEditor.state.doc.descendants((node, position) => {
    if (node.type.name !== "taskItem") {
      return;
    }

    if (currentTaskIndex === taskIndex && selectionPosition === null) {
      selectionPosition = position + 2;
    }

    currentTaskIndex += 1;
    return false;
  });

  if (selectionPosition === null) {
    throw new Error(`Task item ${taskIndex} was not found`);
  }

  targetEditor.commands.setTextSelection(selectionPosition);
}

function taskTexts(targetEditor: Editor) {
  const texts: string[] = [];

  targetEditor.state.doc.descendants((node) => {
    if (node.type.name === "taskItem") {
      texts.push(node.textContent);
    }
  });

  return texts;
}
