import type { AnyExtension } from "@tiptap/core";
import { createTaskItemKeyboard } from "$lib/editor/taskItemKeyboard";

type ExtensionFactory = typeof import("@tiptap/core").Extension;

export async function htmlFromDailyNoteMarkdown(markdown: string) {
  if (!markdown.trim()) {
    return "";
  }

  const normalizedMarkdown = normalizeEmptyListItemMarkers(markdown);
  const [
    { Editor, Extension: TiptapExtension },
    { default: StarterKit },
    { Markdown },
    { default: TaskList },
    { default: TaskItem },
  ] = await Promise.all([
    import("@tiptap/core"),
    import("@tiptap/starter-kit"),
    import("@tiptap/markdown"),
    import("@tiptap/extension-task-list"),
    import("@tiptap/extension-task-item"),
  ]);

  const editor = new Editor({
    content: normalizedMarkdown,
    contentType: "markdown",
    extensions: dailyNoteExtensions(
      TiptapExtension,
      StarterKit,
      Markdown,
      TaskList,
      TaskItem,
    ),
  });
  const html = editor.getHTML();

  editor.destroy();

  return html === "<p></p>" ? "" : html;
}

export function normalizeEmptyListItemMarkers(markdown: string) {
  return markdown.replace(/^([ \t]*[-+*])[ \t]+(?=\r?$)/gm, "$1");
}

export function dailyNoteExtensions(
  extension: ExtensionFactory,
  starterKit: AnyExtension,
  markdown: AnyExtension,
  taskList: AnyExtension,
  taskItem: AnyExtension,
) {
  return [
    starterKit,
    taskList,
    taskItem.configure({
      nested: true,
    }),
    createTaskItemKeyboard(extension),
    markdown,
  ];
}
