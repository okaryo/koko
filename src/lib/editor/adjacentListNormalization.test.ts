import { Editor, Extension, type JSONContent } from "@tiptap/core";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import type { Node } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAdjacentListNormalization,
  createAdjacentListNormalizationPlugin,
  joinAdjacentLists,
} from "./adjacentListNormalization";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("joinAdjacentLists", () => {
  it("joins adjacent bullet lists while preserving their nested lists", () => {
    editor = createEditor([
      bulletList([
        listItem("10:48", [bulletList([listItem("進めていきます")])]),
        listItem("aaaaaaa"),
      ]),
      bulletList([
        listItem("aaaa", [bulletList([listItem("bbb"), listItem("bbb")])]),
      ]),
    ]);

    expect(editor.commands.command(joinAdjacentLists)).toBe(true);
    expect(editor.getJSON().content).toHaveLength(1);
    expect(topLevelListItemTexts(editor)).toEqual([
      "10:48進めていきます",
      "aaaaaaa",
      "aaaabbbbbb",
    ]);
    expect(nestedBulletListTexts(editor)).toEqual(["進めていきます", "bbbbbb"]);
  });

  it("joins adjacent lists at a nested level", () => {
    editor = createEditor([
      bulletList([
        listItem("parent", [
          bulletList([listItem("a")]),
          bulletList([listItem("b")]),
        ]),
      ]),
    ]);

    expect(editor.commands.command(joinAdjacentLists)).toBe(true);
    expect(nestedBulletListTexts(editor)).toEqual(["ab"]);
  });

  it("automatically joins lists when their separating paragraph is deleted", () => {
    editor = createEditor([
      bulletList([listItem("a")]),
      { type: "paragraph" },
      bulletList([listItem("b")]),
    ]);
    const state = EditorState.create({
      schema: editor.schema,
      doc: editor.state.doc,
      plugins: [createAdjacentListNormalizationPlugin()],
    });
    const paragraphStart = state.doc.child(0).nodeSize;
    const paragraphEnd = paragraphStart + state.doc.child(1).nodeSize;

    const result = state.applyTransaction(
      state.tr.delete(paragraphStart, paragraphEnd),
    );

    expect(result.transactions).toHaveLength(2);
    expect(result.state.doc.childCount).toBe(1);
    expect(listItemTextsFromList(result.state.doc.firstChild)).toEqual([
      "a",
      "b",
    ]);
  });

  it("keeps lists separate when a paragraph remains between them", () => {
    editor = createEditor([
      bulletList([listItem("a")]),
      { type: "paragraph" },
      bulletList([listItem("b")]),
    ]);

    expect(editor.commands.command(joinAdjacentLists)).toBe(false);
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual([
      "bulletList",
      "paragraph",
      "bulletList",
    ]);
  });

  it("keeps different list types separate", () => {
    editor = createEditor([
      bulletList([listItem("bullet")]),
      orderedList([listItem("ordered")]),
      taskList([taskItem("task")]),
    ]);

    expect(editor.commands.command(joinAdjacentLists)).toBe(false);
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual([
      "bulletList",
      "orderedList",
      "taskList",
    ]);
  });

  it("joins ordered lists with compatible marker types", () => {
    editor = createEditor([
      orderedList([listItem("a")], { start: 1, type: null }),
      orderedList([listItem("b")], { start: 10, type: "1" }),
    ]);

    expect(editor.commands.command(joinAdjacentLists)).toBe(true);
    expect(topLevelListItemTexts(editor)).toEqual(["a", "b"]);
  });

  it("keeps ordered lists with different marker types separate", () => {
    editor = createEditor([
      orderedList([listItem("a")], { start: 1, type: "a" }),
      orderedList([listItem("b")], { start: 1, type: "i" }),
    ]);

    expect(editor.commands.command(joinAdjacentLists)).toBe(false);
    expect(editor.getJSON().content).toHaveLength(2);
  });

  it("joins adjacent task lists", () => {
    editor = createEditor([
      taskList([taskItem("a")]),
      taskList([taskItem("b", true)]),
    ]);

    expect(editor.commands.command(joinAdjacentLists)).toBe(true);
    expect(editor.getJSON().content).toHaveLength(1);
    expect(taskItemTexts(editor)).toEqual(["a", "b"]);
  });
});

function createEditor(content: JSONContent[]) {
  return new Editor({
    content: { type: "doc", content },
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      createAdjacentListNormalization(Extension),
    ],
  });
}

function bulletList(content: JSONContent[]): JSONContent {
  return { type: "bulletList", content };
}

function orderedList(
  content: JSONContent[],
  attrs?: Record<string, unknown>,
): JSONContent {
  return { type: "orderedList", attrs, content };
}

function taskList(content: JSONContent[]): JSONContent {
  return { type: "taskList", content };
}

function listItem(text: string, rest: JSONContent[] = []): JSONContent {
  return {
    type: "listItem",
    content: [paragraph(text), ...rest],
  };
}

function taskItem(text: string, checked = false): JSONContent {
  return {
    type: "taskItem",
    attrs: { checked },
    content: [paragraph(text)],
  };
}

function paragraph(text: string): JSONContent {
  return {
    type: "paragraph",
    content: text ? [{ type: "text", text }] : undefined,
  };
}

function topLevelListItemTexts(targetEditor: Editor) {
  return listItemTextsFromList(targetEditor.state.doc.firstChild);
}

function listItemTextsFromList(firstList: Node | null) {
  if (!firstList) {
    return [];
  }

  const texts: string[] = [];

  firstList.forEach((item) => {
    texts.push(item.textContent);
  });

  return texts;
}

function nestedBulletListTexts(targetEditor: Editor) {
  const texts: string[] = [];

  targetEditor.state.doc.descendants((node, _position, parent) => {
    if (node.type.name === "bulletList" && parent?.type.name === "listItem") {
      texts.push(node.textContent);
    }
  });

  return texts;
}

function taskItemTexts(targetEditor: Editor) {
  const texts: string[] = [];

  targetEditor.state.doc.descendants((node) => {
    if (node.type.name === "taskItem") {
      texts.push(node.textContent);
    }
  });

  return texts;
}
