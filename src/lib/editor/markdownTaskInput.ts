import { Extension, wrappingInputRule } from "@tiptap/core";

const markdownTaskInputRegex = /^\s*[-+*]\s\[([ xX])\]\s$/;

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
          checked: match[1]?.toLowerCase() === "x",
        }),
      }),
    ];
  },
});
