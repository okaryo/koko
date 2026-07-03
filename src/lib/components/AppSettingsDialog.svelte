<script lang="ts">
  import { onMount } from "svelte";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import {
    getSettings,
    updateDailyNoteTemplateSettings,
  } from "$lib/api/settings";

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();
  let dialogElement = $state<HTMLDialogElement>();
  let templateMarkdown = $state("");
  let savedTemplateMarkdown = $state("");
  let settingsStatus = $state<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("loading");
  const hasTemplateChanges = $derived(
    templateMarkdown !== savedTemplateMarkdown,
  );

  onMount(() => {
    void loadSettings();
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

  async function loadSettings() {
    settingsStatus = "loading";

    try {
      const settings = await getSettings();

      savedTemplateMarkdown = settings.dailyNote.templateMarkdown;
      templateMarkdown = settings.dailyNote.templateMarkdown;
      settingsStatus = "idle";
    } catch (error) {
      console.warn("Settings load failed", error);
      settingsStatus = "error";
    }
  }

  async function saveTemplateSettings() {
    if (!hasTemplateChanges || settingsStatus === "saving") {
      return;
    }

    settingsStatus = "saving";

    try {
      const settings = await updateDailyNoteTemplateSettings(templateMarkdown);

      savedTemplateMarkdown = settings.dailyNote.templateMarkdown;
      templateMarkdown = settings.dailyNote.templateMarkdown;
      settingsStatus = "saved";
    } catch (error) {
      console.warn("DailyNote template update failed", error);
      settingsStatus = "error";
    }
  }

  function handleTemplateInput() {
    if (settingsStatus === "saved") {
      settingsStatus = "idle";
    }
  }

  function clearTemplate() {
    templateMarkdown = "";
    handleTemplateInput();
  }

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialogElement) {
      onClose();
    }
  }

  function handleCancel() {
    onClose();
  }
</script>

<dialog
  class="settings-dialog"
  aria-label="App settings"
  tabindex="-1"
  bind:this={dialogElement}
  onclick={handleDialogClick}
  oncancel={handleCancel}
  onclose={onClose}
>
  <div class="dialog-content">
    <header class="dialog-header">
      <h2>App settings</h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Close"
        title="Close"
        onclick={onClose}
      >
        <X size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </header>

    <section class="settings-section">
      <div class="section-header">
        <h3>DailyNote template</h3>
        {#if settingsStatus === "saving"}
          <span class="settings-status">Saving</span>
        {:else if settingsStatus === "saved"}
          <span
            class="settings-status icon-only"
            title="Saved"
            aria-label="Saved"
          >
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
          </span>
        {:else if settingsStatus === "error"}
          <span class="settings-status error-status">Save failed</span>
        {/if}
      </div>

      <textarea
        bind:value={templateMarkdown}
        aria-label="DailyNote template markdown"
        spellcheck="false"
        oninput={handleTemplateInput}
        placeholder="- [ ]&#10;&#10;## Log"></textarea>

      <div class="settings-actions">
        <button
          type="button"
          class="secondary-button"
          disabled={!templateMarkdown || settingsStatus === "saving"}
          onclick={clearTemplate}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!hasTemplateChanges || settingsStatus === "saving"}
          onclick={() => void saveTemplateSettings()}
        >
          Save
        </button>
      </div>
    </section>
  </div>
</dialog>

<style>
  .settings-dialog {
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

  .settings-dialog:focus {
    outline: none;
  }

  .settings-dialog::backdrop {
    background: rgba(32, 33, 31, 0.28);
  }

  .dialog-content {
    display: flex;
    max-height: inherit;
    min-height: 0;
    flex-direction: column;
  }

  .dialog-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 1rem 1rem 0.75rem;
    border-bottom: 1px solid rgba(43, 41, 36, 0.1);
  }

  h2,
  h3 {
    margin: 0;
  }

  h2 {
    font-size: 1rem;
    font-weight: 760;
  }

  h3 {
    font-size: 0.86rem;
    font-weight: 720;
  }

  .icon-button {
    display: inline-flex;
    width: 30px;
    min-width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: #4c4f45;
  }

  .icon-button:hover {
    background: rgba(46, 51, 42, 0.08);
  }

  .settings-section {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 0.7rem;
    padding: 1rem;
  }

  .section-header {
    display: flex;
    min-height: 1.4rem;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .settings-status {
    display: inline-flex;
    min-width: 0;
    min-height: 1rem;
    align-items: center;
    justify-content: center;
    color: #766d5f;
    font-size: 0.78rem;
    font-weight: 620;
    line-height: 1;
  }

  .settings-status.icon-only {
    width: 1rem;
    height: 1rem;
  }

  .error-status {
    color: #9d3f32;
  }

  textarea {
    width: 100%;
    min-height: 15rem;
    resize: vertical;
    border: 1px solid rgba(43, 41, 36, 0.14);
    border-radius: 6px;
    background: #fffdf8;
    color: #20211f;
    font-family:
      "SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace;
    font-size: 0.9rem;
    line-height: 1.55;
    outline: none;
    padding: 0.75rem;
  }

  textarea:focus {
    border-color: rgba(32, 33, 31, 0.46);
    box-shadow: 0 0 0 2px rgba(46, 51, 42, 0.08);
  }

  .settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .settings-actions button {
    min-height: 32px;
    padding: 0 0.8rem;
  }

  .secondary-button {
    border-color: rgba(43, 41, 36, 0.14);
    background: transparent;
    color: #4a4438;
  }

  .secondary-button:hover:not(:disabled) {
    background: rgba(46, 51, 42, 0.08);
    color: #20211f;
  }
</style>
