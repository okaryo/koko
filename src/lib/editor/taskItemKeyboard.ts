import type { CommandProps } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";

type ExtensionFactory = typeof import("@tiptap/core").Extension;

export function createTaskItemKeyboard(Extension: ExtensionFactory) {
  return Extension.create({
    name: "taskItemKeyboard",
    priority: 110,

    addKeyboardShortcuts() {
      const handleBackspace = () =>
        this.editor.commands.first(({ commands }) => [
          () => commands.undoInputRule(),
          () => commands.command(deleteEmptyListItemBackward),
        ]);

      return {
        Backspace: handleBackspace,
        "Mod-Backspace": handleBackspace,
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

/**
 * Deletes an empty non-first list item on Backspace instead of letting Tiptap
 * lift it out of the list, which would leave a blank paragraph between the
 * surrounding list items.
 */
export function deleteEmptyListItemBackward({ state, tr }: CommandProps) {
  const { selection } = state;

  if (!selection.empty) {
    return false;
  }

  const { $from } = selection;
  let listItemDepth = -1;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const nodeName = $from.node(depth).type.name;

    if (nodeName === "listItem" || nodeName === "taskItem") {
      listItemDepth = depth;
      break;
    }
  }

  if (listItemDepth < 1 || $from.parentOffset !== 0) {
    return false;
  }

  const listItem = $from.node(listItemDepth);
  const firstChild = listItem.firstChild;
  const isEmpty =
    listItem.childCount === 1 &&
    firstChild?.type.name === "paragraph" &&
    firstChild.content.size === 0;

  if (!isEmpty) {
    return false;
  }

  const listDepth = listItemDepth - 1;
  const list = $from.node(listDepth);
  const listItemIndex = $from.index(listDepth);
  const previousListItem =
    listItemIndex > 0 ? list.child(listItemIndex - 1) : null;

  if (previousListItem?.type !== listItem.type) {
    return false;
  }

  const from = $from.before(listItemDepth);
  const to = $from.after(listItemDepth);

  tr.delete(from, to);
  tr.setSelection(Selection.near(tr.doc.resolve(from), -1));

  return true;
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
