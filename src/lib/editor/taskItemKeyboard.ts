import type { CommandProps } from "@tiptap/core";

type ExtensionFactory = typeof import("@tiptap/core").Extension;

export function createTaskItemKeyboard(Extension: ExtensionFactory) {
  return Extension.create({
    name: "taskItemKeyboard",

    addKeyboardShortcuts() {
      return {
        "Mod-Enter": () =>
          this.editor
            .chain()
            .focus()
            .command(toggleSelectedTaskItemChecked)
            .run(),
      };
    },
  });
}

export function toggleSelectedTaskItemChecked({ state, tr }: CommandProps) {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);

    if (node.type.name !== "taskItem") {
      continue;
    }

    tr.setNodeMarkup($from.before(depth), undefined, {
      ...node.attrs,
      checked: !node.attrs.checked,
    });

    return true;
  }

  return false;
}
