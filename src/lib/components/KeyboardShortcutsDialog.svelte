<script lang="ts">
  import { onMount } from "svelte";
  import Pencil from "@lucide/svelte/icons/pencil";
  import X from "@lucide/svelte/icons/x";
  import {
    getSettings,
    updateDailyNoteGlobalShortcut,
  } from "$lib/api/settings";
  import {
    shortcutFromKeydown,
    shortcutToDisplayKeys,
  } from "$lib/globalShortcut";

  const DEFAULT_DAILY_NOTE_GLOBAL_SHORTCUT = "CommandOrControl+Shift+L";

  type Shortcut = {
    action: string;
    keys: string[];
  };

  type ShortcutGroup = {
    title: string;
    shortcuts: Shortcut[];
  };

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();
  let dialogElement = $state<HTMLDialogElement>();
  let dailyNoteGlobalShortcut = $state(DEFAULT_DAILY_NOTE_GLOBAL_SHORTCUT);
  let isRecordingGlobalShortcut = $state(false);
  let isSavingGlobalShortcut = $state(false);
  let globalShortcutMessage = $state<string | null>(null);
  const dailyNoteGlobalShortcutKeys = $derived(
    shortcutToDisplayKeys(dailyNoteGlobalShortcut),
  );

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "DailyNote",
      shortcuts: [
        { action: "Focus editor", keys: ["Cmd", "Shift", "N"] },
        { action: "Copy note", keys: ["Cmd", "Shift", "C"] },
        { action: "Insert timestamp", keys: ["Ctrl", "T"] },
        { action: "Toggle checkbox", keys: ["Cmd", "Enter"] },
      ],
    },
    {
      title: "Pomodoro",
      shortcuts: [
        { action: "Start or pause", keys: ["Cmd", "Shift", "P"] },
        { action: "Reset", keys: ["Cmd", "Shift", "R"] },
      ],
    },
    {
      title: "Sticky Notes",
      shortcuts: [
        { action: "Focus new sticky note", keys: ["Cmd", "Shift", "I"] },
        { action: "Save sticky note", keys: ["Cmd", "Enter"] },
        { action: "Cancel sticky note editing", keys: ["Esc"] },
      ],
    },
    {
      title: "App",
      shortcuts: [
        { action: "Keyboard shortcuts", keys: ["Cmd", "/"] },
        { action: "Close dialog", keys: ["Esc"] },
      ],
    },
  ];

  onMount(() => {
    getSettings()
      .then((settings) => {
        dailyNoteGlobalShortcut = settings.globalShortcut.dailyNoteFocus;
      })
      .catch((error) => {
        console.warn("Settings load failed", error);
      });
  });

  $effect(() => {
    if (!dialogElement) {
      return;
    }

    if (open && !dialogElement.open) {
      dialogElement.showModal();
      dialogElement.focus({ preventScroll: true });
      return;
    }

    if (!open && dialogElement.open) {
      dialogElement.close();
    }
  });

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialogElement) {
      cancelRecording();
      onClose();
    }
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (!isRecordingGlobalShortcut) {
      return;
    }

    if (
      event.target instanceof HTMLElement &&
      event.target.closest("[data-recording-control]")
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.key === "Escape") {
      cancelRecording();
      return;
    }

    if (event.repeat || isSavingGlobalShortcut) {
      return;
    }

    const result = shortcutFromKeydown(event);

    if (result.status === "pending") {
      return;
    }

    if (result.status === "invalid") {
      globalShortcutMessage = result.message;
      return;
    }

    void saveGlobalShortcut(result.shortcut);
  }

  function handleCancel(event: Event) {
    if (isRecordingGlobalShortcut) {
      event.preventDefault();
      cancelRecording();
      return;
    }

    onClose();
  }

  function startRecording() {
    if (isSavingGlobalShortcut) {
      return;
    }

    isRecordingGlobalShortcut = true;
    globalShortcutMessage = null;
  }

  function cancelRecording() {
    isRecordingGlobalShortcut = false;
    globalShortcutMessage = null;
  }

  async function saveGlobalShortcut(shortcut: string) {
    isSavingGlobalShortcut = true;
    globalShortcutMessage = null;

    try {
      const settings = await updateDailyNoteGlobalShortcut(shortcut);
      dailyNoteGlobalShortcut = settings.globalShortcut.dailyNoteFocus;
      isRecordingGlobalShortcut = false;
    } catch (error) {
      console.warn("DailyNote global shortcut update failed", error);
      globalShortcutMessage = "That shortcut could not be registered.";
    } finally {
      isSavingGlobalShortcut = false;
    }
  }
</script>

<dialog
  class="shortcut-dialog"
  aria-label="Keyboard shortcuts"
  tabindex="-1"
  bind:this={dialogElement}
  onclick={handleDialogClick}
  onkeydown={handleDialogKeydown}
  oncancel={handleCancel}
  onclose={onClose}
>
  <div class="dialog-content">
    <header class="dialog-header">
      <h2>Keyboard shortcuts</h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Close"
        title="Close"
        onclick={() => {
          cancelRecording();
          onClose();
        }}
      >
        <X size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </header>

    <div class="shortcut-groups">
      <section class="shortcut-group">
        <h3>Global shortcuts</h3>
        <div class="shortcut-list">
          <div class="shortcut-row editable-shortcut-row">
            <span>Focus DailyNote</span>
            <div class="editable-shortcut-controls">
              {#if isRecordingGlobalShortcut}
                <span
                  class="recording-target"
                  aria-describedby={globalShortcutMessage
                    ? "global-shortcut-message"
                    : undefined}
                >
                  Press shortcut
                </span>
                <button
                  class="cancel-recording-button"
                  type="button"
                  data-recording-control
                  title="Cancel shortcut recording"
                  aria-label="Cancel shortcut recording"
                  onclick={cancelRecording}
                >
                  <X size={14} strokeWidth={2.2} aria-hidden="true" />
                </button>
              {:else}
                <span class="shortcut-keys editable-shortcut-keys">
                  {#each dailyNoteGlobalShortcutKeys as key, index (`${key}-${index}`)}
                    <kbd>{key}</kbd>
                  {/each}
                </span>
                <button
                  class="shortcut-edit-button"
                  type="button"
                  title="Edit DailyNote global shortcut"
                  aria-label="Edit DailyNote global shortcut"
                  aria-describedby={globalShortcutMessage
                    ? "global-shortcut-message"
                    : undefined}
                  disabled={isSavingGlobalShortcut}
                  onclick={startRecording}
                >
                  <Pencil size={13} strokeWidth={2.2} aria-hidden="true" />
                  Edit
                </button>
              {/if}
            </div>
          </div>
        </div>
        {#if globalShortcutMessage}
          <p id="global-shortcut-message" class="shortcut-message">
            {globalShortcutMessage}
          </p>
        {/if}
      </section>

      {#each shortcutGroups as group (group.title)}
        <section class="shortcut-group">
          <h3>{group.title}</h3>
          <div class="shortcut-list">
            {#each group.shortcuts as shortcut (shortcut.action)}
              <div class="shortcut-row">
                <span>{shortcut.action}</span>
                <span class="shortcut-keys">
                  {#each shortcut.keys as key (key)}
                    <kbd>{key}</kbd>
                  {/each}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
</dialog>

<style>
  .shortcut-dialog {
    width: min(34rem, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    padding: 0;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-radius: 8px;
    background: #fffdf8;
    color: #20211f;
    overflow: hidden;
    box-shadow: 0 18px 48px rgba(43, 41, 36, 0.24);
  }

  .shortcut-dialog:focus {
    outline: none;
  }

  .shortcut-dialog::backdrop {
    background: rgba(32, 33, 31, 0.28);
  }

  .dialog-content {
    display: flex;
    max-height: inherit;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(43, 41, 36, 0.1);
  }

  h2,
  h3 {
    margin: 0;
    line-height: 1.1;
  }

  h2 {
    font-size: 1rem;
  }

  h3 {
    color: #5a5449;
    font-size: 0.78rem;
    font-weight: 720;
  }

  .icon-button {
    display: inline-flex;
    width: 32px;
    min-width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: #4a4438;
  }

  .icon-button:hover {
    background: rgba(43, 41, 36, 0.08);
    color: #20211f;
  }

  .shortcut-groups {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 14px;
    overflow: auto;
    padding: 14px 16px 16px;
  }

  .shortcut-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-list {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(43, 41, 36, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .shortcut-row {
    display: flex;
    min-height: 40px;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(43, 41, 36, 0.08);
    font-size: 0.87rem;
  }

  .shortcut-row:last-child {
    border-bottom: 0;
  }

  .shortcut-keys {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 5px;
  }

  .editable-shortcut-row {
    align-items: center;
  }

  .editable-shortcut-controls {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .editable-shortcut-keys {
    flex-wrap: nowrap;
  }

  .shortcut-edit-button {
    display: inline-flex;
    min-height: 30px;
    align-items: center;
    gap: 5px;
    padding: 0 9px;
    border: 1px solid #2e332a;
    border-radius: 6px;
    background: #2e332a;
    color: #fffdf8;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .shortcut-edit-button:hover,
  .shortcut-edit-button:focus-visible {
    border-color: #22271f;
    background: #22271f;
    color: #fffdf8;
  }

  .shortcut-edit-button:disabled {
    cursor: default;
    opacity: 0.72;
  }

  .recording-target {
    display: inline-flex;
    min-height: 30px;
    align-items: center;
    padding: 0 10px;
    border: 1px solid rgba(111, 143, 78, 0.42);
    border-radius: 6px;
    background: rgba(111, 143, 78, 0.1);
    color: #354822;
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.1;
  }

  .cancel-recording-button {
    display: inline-flex;
    width: 30px;
    min-width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-radius: 6px;
    background: transparent;
    color: #4a4438;
  }

  .cancel-recording-button:hover,
  .cancel-recording-button:focus-visible {
    border-color: rgba(43, 41, 36, 0.24);
    background: rgba(43, 41, 36, 0.08);
    color: #20211f;
  }

  .shortcut-message {
    margin: -2px 0 0;
    color: #9a3f2f;
    font-size: 0.78rem;
    line-height: 1.3;
  }

  kbd {
    min-width: 1.5rem;
    padding: 3px 6px;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-bottom-color: rgba(43, 41, 36, 0.28);
    border-radius: 5px;
    background: #f4f1ea;
    color: #3d3931;
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1.1;
    text-align: center;
  }
</style>
