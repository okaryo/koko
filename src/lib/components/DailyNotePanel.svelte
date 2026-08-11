<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Check from "@lucide/svelte/icons/check";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import Copy from "@lucide/svelte/icons/copy";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import type { Editor } from "@tiptap/core";
  import type {} from "@tiptap/markdown";
  import { formatLocalTime } from "$lib/date";
  import { joinAdjacentLists } from "$lib/editor/adjacentListNormalization";
  import {
    looksLikeMarkdown,
    markdownFromTiptapJson,
  } from "$lib/editor/markdown";
  import { overlayScrollbars } from "$lib/actions/overlayScrollbars";
  import { dailyNoteExtensions } from "$lib/editor/dailyNoteContent";
  import { dailyNoteCommandFromKeydown, isEditableTarget } from "$lib/keyboard";

  type Props = {
    bodyHtml: string;
    dateLabel: string;
    isToday: boolean;
    nextNoteDate: string | null;
    previousNoteDate: string | null;
    saveStatus: "idle" | "saving" | "saved" | "error";
    todayDailyNoteExists: boolean;
    onBodyChange: (bodyHtml: string) => void;
    onGoToNextNote: () => void | Promise<void>;
    onGoToPreviousNote: () => void | Promise<void>;
    onGoToTodayNote: () => void | Promise<void>;
    onStartTodayNote: () => void | Promise<void>;
  };

  let {
    bodyHtml,
    dateLabel,
    isToday,
    nextNoteDate,
    previousNoteDate,
    saveStatus,
    todayDailyNoteExists,
    onBodyChange,
    onGoToNextNote,
    onGoToPreviousNote,
    onGoToTodayNote,
    onStartTodayNote,
  }: Props = $props();

  let editorElement = $state<HTMLDivElement>();
  let editor = $state<Editor | null>(null);
  let applyingExternalContent = false;
  let copyStatus = $state<"idle" | "copied" | "error">("idle");
  let copyStatusTimeout: ReturnType<typeof setTimeout> | null = null;
  let unlistenDailyNoteFocus: UnlistenFn | null = null;

  onMount(() => {
    let isMounted = true;

    async function createEditor() {
      if (!editorElement || editor) {
        return;
      }

      const [
        { Editor, Extension },
        { default: StarterKit },
        { default: Placeholder },
        { Markdown },
        { default: TaskList },
        { default: TaskItem },
      ] = await Promise.all([
        import("@tiptap/core"),
        import("@tiptap/starter-kit"),
        import("@tiptap/extension-placeholder"),
        import("@tiptap/markdown"),
        import("@tiptap/extension-task-list"),
        import("@tiptap/extension-task-item"),
      ]);

      if (!isMounted || !editorElement) {
        return;
      }

      editor = new Editor({
        element: editorElement,
        content: bodyHtml,
        extensions: [
          ...dailyNoteExtensions(
            Extension,
            StarterKit,
            Markdown,
            TaskList,
            TaskItem,
          ),
          Placeholder.configure({
            placeholder: "Start writing...",
          }),
        ],
        editorProps: {
          attributes: {
            "aria-label": "DailyNote body",
            autocapitalize: "off",
            autocomplete: "off",
            autocorrect: "off",
            class: "daily-note-editor",
            spellcheck: "false",
          },
          handlePaste: (_view, event) => handleEditorPaste(event),
        },
        onUpdate: ({ editor: updatedEditor }) => {
          if (applyingExternalContent) {
            return;
          }

          onBodyChange(updatedEditor.getHTML());
        },
      });

      editor.commands.command(joinAdjacentLists);

      focusEditorAtStart();
    }

    void createEditor();

    listen("daily-note:focus", () => {
      focusEditor();
    })
      .then((unlisten) => {
        if (!isMounted) {
          unlisten();
          return;
        }

        unlistenDailyNoteFocus = unlisten;
      })
      .catch((error) => {
        console.warn("DailyNote global focus listener setup failed", error);
      });

    return () => {
      isMounted = false;
      unlistenDailyNoteFocus?.();
      unlistenDailyNoteFocus = null;
    };
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
    clearCopyStatusTimeout();
    editor?.destroy();
    editor = null;
  });

  function handleKeydown(event: KeyboardEvent) {
    const dailyNoteCommand = dailyNoteCommandFromKeydown(event);

    if (!dailyNoteCommand) {
      return;
    }

    if (shouldIgnoreDailyNoteCommand(event, dailyNoteCommand)) {
      return;
    }

    event.preventDefault();

    if (dailyNoteCommand === "focus") {
      focusEditor();
      return;
    }

    if (dailyNoteCommand === "copyMarkdown") {
      void copyDailyNoteMarkdown();
      return;
    }

    insertTimestamp();
  }

  function focusEditor() {
    if (!editor) {
      return;
    }

    editor.commands.focus();
  }

  function focusEditorAtStart() {
    if (!editor) {
      return;
    }

    editor.commands.focus("start", { scrollIntoView: false });
  }

  function insertTimestamp() {
    const timestamp = formatLocalTime(new Date());

    editor?.chain().focus().insertContent(timestamp).run();
  }

  function handleEditorPaste(event: ClipboardEvent) {
    const clipboardData = event.clipboardData;

    if (!editor || !clipboardData) {
      return false;
    }

    if (clipboardData.getData("text/html").trim()) {
      return false;
    }

    const text = clipboardData.getData("text/plain");

    if (!looksLikeMarkdown(text)) {
      return false;
    }

    event.preventDefault();
    editor
      .chain()
      .focus()
      .insertContent(text, { contentType: "markdown" })
      .run();

    return true;
  }

  async function copyDailyNoteMarkdown() {
    if (!editor) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        markdownFromTiptapJson(editor.getJSON()),
      );
      showCopyStatus("copied");
    } catch (error) {
      console.warn("DailyNote copy failed", error);
      showCopyStatus("error");
    }
  }

  function showCopyStatus(status: "copied" | "error") {
    clearCopyStatusTimeout();
    copyStatus = status;

    copyStatusTimeout = setTimeout(() => {
      copyStatus = "idle";
      copyStatusTimeout = null;
    }, 2_000);
  }

  function clearCopyStatusTimeout() {
    if (!copyStatusTimeout) {
      return;
    }

    clearTimeout(copyStatusTimeout);
    copyStatusTimeout = null;
  }

  function shouldIgnoreDailyNoteCommand(
    event: KeyboardEvent,
    command: ReturnType<typeof dailyNoteCommandFromKeydown>,
  ) {
    if (command === "focus") {
      return isEventTargetInsideOpenDialog(event.target);
    }

    return (
      isEventTargetInsideOpenDialog(event.target) ||
      isEditableTargetOutsideEditor(event.target)
    );
  }

  function isEditableTargetOutsideEditor(target: EventTarget | null) {
    if (!isEditableTarget(target)) {
      return false;
    }

    return !(target instanceof Node && editorElement?.contains(target));
  }

  function isEventTargetInsideOpenDialog(target: EventTarget | null) {
    const openDialog = document.querySelector("dialog[open]");

    return (
      target instanceof Node &&
      openDialog instanceof HTMLDialogElement &&
      openDialog.contains(target)
    );
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="note-panel" aria-label="DailyNote editor">
  <header class="panel-header note-header">
    <div class="note-title-group">
      <h1>{dateLabel}</h1>
      <div class="note-navigation" aria-label="DailyNote navigation">
        <button
          class="icon-button"
          type="button"
          title="Previous note"
          aria-label="Previous note"
          disabled={!previousNoteDate}
          onclick={() => void onGoToPreviousNote()}
        >
          <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
        {#if todayDailyNoteExists}
          <button
            class="today-button"
            type="button"
            title="Go to today"
            aria-label="Go to today"
            disabled={isToday}
            onclick={() => void onGoToTodayNote()}
          >
            <CalendarDays size={14} strokeWidth={2.2} aria-hidden="true" />
            Today
          </button>
        {:else}
          <button
            class="today-button start-today-button"
            type="button"
            title="Start today's note"
            aria-label="Start today's note"
            disabled={isToday}
            onclick={() => void onStartTodayNote()}
          >
            <CalendarDays size={14} strokeWidth={2.2} aria-hidden="true" />
            Start today's note
          </button>
        {/if}
        <button
          class="icon-button"
          type="button"
          title="Next note"
          aria-label="Next note"
          disabled={!nextNoteDate}
          onclick={() => void onGoToNextNote()}
        >
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </div>
    <div class="note-header-actions">
      {#if saveStatus === "saving"}
        <span
          class="save-status icon-only saving-status"
          title="Saving"
          aria-label="Saving"
        >
          <LoaderCircle size={16} strokeWidth={2.2} aria-hidden="true" />
        </span>
      {:else if saveStatus === "saved"}
        <span class="save-status icon-only" title="Saved" aria-label="Saved">
          <Check size={16} strokeWidth={2.2} aria-hidden="true" />
        </span>
      {:else if saveStatus === "error"}
        <span class="save-status error-status">
          <CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
          Save failed
        </span>
      {/if}
      <button
        class="icon-button"
        type="button"
        title={copyStatus === "copied" ? "Copied" : "Copy note"}
        aria-label={copyStatus === "copied" ? "Copied" : "Copy note"}
        onclick={() => void copyDailyNoteMarkdown()}
      >
        {#if copyStatus === "copied"}
          <Check size={16} strokeWidth={2.2} aria-hidden="true" />
        {:else if copyStatus === "error"}
          <CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
        {:else}
          <Copy size={16} strokeWidth={2.2} aria-hidden="true" />
        {/if}
      </button>
    </div>
  </header>

  <div
    class="daily-note"
    data-overlayscrollbars-initialize
    use:overlayScrollbars={{ viewport: editorElement }}
  >
    <div class="daily-note-editor-host" bind:this={editorElement}></div>
  </div>
</section>

<style>
  .note-panel {
    display: flex;
    min-width: 0;
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

  .note-title-group {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 720;
    line-height: 1.1;
  }

  .note-navigation {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .note-header-actions {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .note-header-actions button {
    flex: 0 1 auto;
    min-width: 0;
  }

  .note-header-actions .icon-button {
    display: inline-flex;
    width: 34px;
    flex: 0 0 34px;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    color: #4c4f45;
  }

  .note-header-actions .icon-button:hover {
    background: rgba(46, 51, 42, 0.08);
  }

  .note-navigation .icon-button,
  .today-button {
    height: 30px;
    min-height: 30px;
    border-color: transparent;
    background: transparent;
    color: #5a5449;
  }

  .note-navigation .icon-button {
    display: inline-flex;
    width: 30px;
    min-width: 30px;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
  }

  .today-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 8px;
    font-size: 0.82rem;
    font-weight: 680;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .start-today-button {
    border-color: #2e332a;
    background: #2e332a;
    color: #fffdf8;
    padding: 0 10px;
  }

  .start-today-button:not(:disabled):hover {
    background: #22271f;
    color: #fffdf8;
  }

  .start-today-button:disabled {
    border-color: transparent;
    background: rgba(46, 51, 42, 0.12);
    color: rgba(46, 51, 42, 0.42);
  }

  .note-navigation .icon-button:hover,
  .today-button:not(.start-today-button):not(:disabled):hover {
    background: rgba(46, 51, 42, 0.08);
    color: #20211f;
  }

  .note-navigation .icon-button:disabled,
  .today-button:disabled {
    background: transparent;
    color: rgba(74, 68, 56, 0.28);
    cursor: default;
  }

  .save-status {
    display: inline-flex;
    width: auto;
    height: 24px;
    align-items: center;
    justify-content: center;
    gap: 5px;
    color: #766d5f;
    font-size: 0.78rem;
    line-height: 1;
    white-space: nowrap;
  }

  .save-status.icon-only {
    width: 24px;
  }

  .save-status.icon-only :global(svg) {
    display: block;
  }

  .saving-status :global(svg) {
    animation: spin 0.9s linear infinite;
    transform-box: view-box;
    transform-origin: center;
  }

  .note-header-actions .save-status:first-child:last-child {
    margin-right: -2px;
  }

  .note-header-actions .error-status {
    color: #9d3f32;
  }

  .save-status :global(svg) {
    flex: 0 0 auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .daily-note {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 6px;
    background: #fffdf8;
  }

  .daily-note-editor-host {
    min-height: 100%;
  }

  :global(.daily-note-editor) {
    width: 100%;
    min-height: 100%;
    padding: 22px;
    outline: none;
    color: #20211f;
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace;
    font-size: 0.96rem;
    line-height: 1.62;
    white-space: pre-wrap;
  }

  :global(.daily-note-editor p) {
    margin: 0 0 0.76rem;
  }

  :global(.daily-note-editor h1),
  :global(.daily-note-editor h2),
  :global(.daily-note-editor h3),
  :global(.daily-note-editor h4),
  :global(.daily-note-editor h5),
  :global(.daily-note-editor h6) {
    margin: 1.5rem 0 0.76rem;
    color: #24261f;
    font-weight: 760;
    line-height: 1.25;
  }

  :global(.daily-note-editor h1) {
    font-size: 1.42rem;
  }

  :global(.daily-note-editor h2) {
    font-size: 1.24rem;
  }

  :global(.daily-note-editor h3) {
    font-size: 1.08rem;
  }

  :global(.daily-note-editor h4),
  :global(.daily-note-editor h5),
  :global(.daily-note-editor h6) {
    font-size: 1rem;
  }

  :global(.daily-note-editor h1::before),
  :global(.daily-note-editor h2::before),
  :global(.daily-note-editor h3::before),
  :global(.daily-note-editor h4::before),
  :global(.daily-note-editor h5::before),
  :global(.daily-note-editor h6::before) {
    color: #7b766b;
    font-weight: 650;
  }

  :global(.daily-note-editor h1::before) {
    content: "# ";
  }

  :global(.daily-note-editor h2::before) {
    content: "## ";
  }

  :global(.daily-note-editor h3::before) {
    content: "### ";
  }

  :global(.daily-note-editor h4::before) {
    content: "#### ";
  }

  :global(.daily-note-editor h5::before) {
    content: "##### ";
  }

  :global(.daily-note-editor h6::before) {
    content: "###### ";
  }

  :global(.daily-note-editor h1:first-child),
  :global(.daily-note-editor h2:first-child),
  :global(.daily-note-editor h3:first-child),
  :global(.daily-note-editor h4:first-child),
  :global(.daily-note-editor h5:first-child),
  :global(.daily-note-editor h6:first-child) {
    margin-top: 0;
  }

  :global(.daily-note-editor ul),
  :global(.daily-note-editor ol) {
    margin: 0;
    padding-left: 1.4rem;
  }

  :global(.daily-note-editor li) {
    margin: 0;
  }

  :global(.daily-note-editor li + li) {
    margin-top: 0.24rem;
  }

  :global(.daily-note-editor li > ul),
  :global(.daily-note-editor li > ol),
  :global(.daily-note-editor li > div > ul),
  :global(.daily-note-editor li > div > ol) {
    margin-top: 0.24rem;
  }

  :global(.daily-note-editor li > p) {
    margin: 0;
  }

  :global(.daily-note-editor :is(ul, ol) + :is(ul, ol)) {
    margin-top: 0.76rem;
  }

  :global(
    .daily-note-editor :is(ul, ol) + :not(ul, ol, h1, h2, h3, h4, h5, h6)
  ) {
    margin-top: 0.76rem;
  }

  :global(.daily-note-editor blockquote) {
    margin: 0 0 0.76rem;
    padding-left: 0.9rem;
    border-left: 3px solid rgba(99, 122, 69, 0.38);
    color: #5b554a;
  }

  :global(.daily-note-editor code) {
    padding: 0.05rem 0.25rem;
    border-radius: 4px;
    background: rgba(43, 41, 36, 0.07);
    color: #2f332b;
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace;
    font-size: 0.92em;
  }

  :global(.daily-note-editor pre) {
    margin: 0 0 0.8rem;
    padding: 0.8rem;
    border-radius: 6px;
    background: #f1eee6;
    overflow: auto;
  }

  :global(.daily-note-editor pre code) {
    padding: 0;
    background: transparent;
  }

  :global(.daily-note-editor a) {
    color: #466b88;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.16em;
  }

  :global(.daily-note-editor ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
  }

  :global(.daily-note-editor ul[data-type="taskList"] > li[data-checked]) {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
  }

  :global(
    .daily-note-editor ul[data-type="taskList"] > li[data-checked] > label
  ) {
    position: relative;
    display: inline-flex;
    width: 18px;
    height: 1.62em;
    flex: 0 0 18px;
    align-items: center;
    justify-content: center;
    padding-top: 0;
    cursor: pointer;
  }

  :global(
    .daily-note-editor
      ul[data-type="taskList"]
      > li[data-checked]
      > label
      > input
  ) {
    position: absolute;
    width: 16px;
    height: 16px;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  :global(
    .daily-note-editor
      ul[data-type="taskList"]
      > li[data-checked]
      > label
      > span
  ) {
    display: block;
    width: 16px;
    height: 16px;
    border: 1.5px solid #8d9484;
    border-radius: 4px;
    background: #fffdf8;
  }

  :global(
    .daily-note-editor
      ul[data-type="taskList"]
      > li[data-checked]
      > label
      > input:checked
      + span
  ) {
    border-color: #2563eb;
    background: #2563eb;
  }

  :global(
    .daily-note-editor
      ul[data-type="taskList"]
      > li[data-checked]
      > label
      > input:checked
      + span::after
  ) {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 7px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: translate(-50%, -58%) rotate(45deg);
  }

  :global(
    .daily-note-editor
      ul[data-type="taskList"]
      > li[data-checked]
      > label
      > input:focus-visible
      + span
  ) {
    outline: 2px solid rgba(37, 99, 235, 0.35);
    outline-offset: 2px;
  }

  :global(
    .daily-note-editor ul[data-type="taskList"] > li[data-checked] > div
  ) {
    flex: 1;
    min-width: 0;
  }

  :global(.daily-note-editor > ul[data-type="taskList"]) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  :global(.daily-note-editor > ul[data-type="taskList"] > li[data-checked]) {
    max-width: 100%;
  }

  :global(
    .daily-note-editor > ul[data-type="taskList"] > li[data-checked] > div
  ) {
    flex: 0 1 auto;
    min-width: 1px;
    max-width: calc(100% - 18px - 0.45rem);
  }

  :global(
    .daily-note-editor ul[data-type="taskList"] > li[data-checked] > div > p
  ) {
    margin: 0;
  }

  :global(.daily-note-editor .is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    color: #8b8375;
    pointer-events: none;
  }
</style>
