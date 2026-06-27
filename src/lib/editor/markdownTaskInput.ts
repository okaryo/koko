import { Extension, wrappingInputRule } from "@tiptap/core";

export const markdownTaskInputRegex = /^\s*[-+*]\s\[([ xX])\]\s$/;

export function checkedFromMarkdownTaskInputMatch(match: RegExpMatchArray) {
  return match[1]?.toLowerCase() === "x";
}

export const MarkdownTaskInput = Extension.create({
  name: "markdownTaskInput",

  addInputRules() {
    const taskItemType = this.editor.schema.nodes.taskItem;

    if (!taskItemType) {
      return [];
    }

    return [
      wrappingInputRule({
        find: markdownTaskInputRegex,
        type: taskItemType,
        getAttributes: (match) => ({
          checked: checkedFromMarkdownTaskInputMatch(match),
        }),
      }),
    ];
  },
});
