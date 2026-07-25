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
          () => commands.command(deleteEmptyTaskItemBackward),
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
 * Deletes an empty task item on Backspace instead of letting Tiptap lift it
 * out of the list, which would leave a blank paragraph between task items.
 */
export function deleteEmptyTaskItemBackward({ state, tr }: CommandProps) {
  const { selection } = state;

  if (!selection.empty) {
    return false;
  }

  const { $from } = selection;
  let taskItemDepth = -1;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "taskItem") {
      taskItemDepth = depth;
      break;
    }
  }

  if (taskItemDepth < 1 || $from.parentOffset !== 0) {
    return false;
  }

  const taskItem = $from.node(taskItemDepth);
  const firstChild = taskItem.firstChild;
  const isEmpty =
    taskItem.childCount === 1 &&
    firstChild?.type.name === "paragraph" &&
    firstChild.content.size === 0;

  if (!isEmpty) {
    return false;
  }

  const taskListDepth = taskItemDepth - 1;
  const taskList = $from.node(taskListDepth);
  const taskItemIndex = $from.index(taskListDepth);
  const previousTaskItem =
    taskItemIndex > 0 ? taskList.child(taskItemIndex - 1) : null;

  if (
    taskList.type.name !== "taskList" ||
    previousTaskItem?.type.name !== "taskItem"
  ) {
    return false;
  }

  const from = $from.before(taskItemDepth);
  const to = $from.after(taskItemDepth);

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
