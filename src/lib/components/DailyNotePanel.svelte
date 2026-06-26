<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { Editor } from "@tiptap/core";

  type Props = {
    bodyHtml: string;
    canStartTodayNote: boolean;
    dateLabel: string;
    onBodyChange: (bodyHtml: string) => void;
    onStartTodayNote: () => void | Promise<void>;
  };

  let {
    bodyHtml,
    canStartTodayNote,
    dateLabel,
    onBodyChange,
    onStartTodayNote,
  }: Props = $props();

  let editorElement = $state<HTMLDivElement>();
  let editor: Editor | null = null;
  let applyingExternalContent = false;

  onMount(async () => {
    if (!editorElement || editor) {
      return;
    }

    const [
      { Editor },
      { default: StarterKit },
      { default: Placeholder },
      { default: TaskList },
      { default: TaskItem },
    ] = await Promise.all([
      import("@tiptap/core"),
      import("@tiptap/starter-kit"),
      import("@tiptap/extension-placeholder"),
      import("@tiptap/extension-task-list"),
      import("@tiptap/extension-task-item"),
    ]);

    if (!editorElement) {
      return;
    }

    editor = new Editor({
      element: editorElement,
      content: bodyHtml,
      extensions: [
        StarterKit,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Placeholder.configure({
          placeholder:
            "Write tasks, logs, decisions, links, and return points...",
        }),
      ],
      editorProps: {
        attributes: {
          "aria-label": "DailyNote body",
          class: "daily-note-editor",
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        if (applyingExternalContent) {
          return;
        }

        onBodyChange(updatedEditor.getHTML());
      },
    });
  });

  $effect(() => {
    if (!editor || editor.getHTML() === bodyHtml) {
      return;
    }

    applyingExternalContent = true;
    editor.commands.setContent(bodyHtml);
    applyingExternalContent = false;
  });

  onDestroy(() => {
    editor?.destroy();
    editor = null;
  });
</script>

<section class="note-panel" aria-label="DailyNote editor">
  <header class="panel-header note-header">
    <h1>{dateLabel}</h1>
    {#if canStartTodayNote}
      <button type="button" onclick={() => void onStartTodayNote()}>
        Start today's note
      </button>
    {/if}
  </header>

  <div class="daily-note" bind:this={editorElement}></div>
</section>

<style>
  .note-panel {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.9rem;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: #fffdf8;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .note-header {
    min-height: 2.2rem;
  }

  h1 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 720;
    line-height: 1.1;
  }

  .daily-note {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 6px;
    background: #fffdf8;
  }

  :global(.daily-note-editor) {
    min-height: 100%;
    padding: 20px;
    outline: none;
    color: #20211f;
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace;
    font-size: 0.95rem;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  :global(.daily-note-editor p) {
    margin: 0 0 0.7rem;
  }

  :global(.daily-note-editor ul),
  :global(.daily-note-editor ol) {
    margin: 0 0 0.7rem;
    padding-left: 1.4rem;
  }

  :global(.daily-note-editor li) {
    margin: 0.18rem 0;
  }

  :global(.daily-note-editor ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
  }

  :global(.daily-note-editor li[data-type="taskItem"]) {
    display: flex;
    gap: 0.5rem;
  }

  :global(.daily-note-editor li[data-type="taskItem"] > label) {
    display: flex;
    align-items: flex-start;
    padding-top: 0.1rem;
  }

  :global(.daily-note-editor li[data-type="taskItem"] > div) {
    flex: 1;
    min-width: 0;
  }

  :global(.daily-note-editor .is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    color: #8b8375;
    pointer-events: none;
  }
</style>
