<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    getOrCreateDailyNote,
    updateDailyNoteBody,
    type DailyNote,
  } from "$lib/api/dailyNotes";
  import DailyNotePanel from "$lib/components/DailyNotePanel.svelte";
  import KeyboardShortcutsDialog from "$lib/components/KeyboardShortcutsDialog.svelte";
  import PinsPanel from "$lib/components/PinsPanel.svelte";
  import PomodoroPanel from "$lib/components/PomodoroPanel.svelte";
  import { formatDateLabel, formatLocalDate } from "$lib/date";
  import { appCommandFromKeydown } from "$lib/keyboard";

  type DailyNoteSaveStatus = "idle" | "saving" | "saved" | "error";

  let dailyNoteHtml = $state("");
  let activeDailyNote = $state<DailyNote | null>(null);
  let activeNoteDate = $state(formatLocalDate(new Date()));
  let currentDate = $state(formatLocalDate(new Date()));
  let dailyNoteSaveStatus = $state<DailyNoteSaveStatus>("idle");
  let keyboardShortcutsOpen = $state(false);
  let dateCheckInterval: ReturnType<typeof setInterval> | null = null;
  let dailyNoteSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let dailyNoteSavedStatusTimeout: ReturnType<typeof setTimeout> | null = null;
  const activeNoteDateLabel = $derived(formatDateLabel(activeNoteDate));
  const canStartTodayNote = $derived(currentDate > activeNoteDate);

  onMount(async () => {
    activeDailyNote = await loadDailyNote(activeNoteDate);
    dailyNoteHtml = activeDailyNote?.bodyHtml ?? "";
    dailyNoteSaveStatus = activeDailyNote ? "idle" : "error";
    dateCheckInterval = setInterval(() => {
      currentDate = formatLocalDate(new Date());
    }, 60_000);
  });

  onDestroy(() => {
    stopDateCheck();
    clearDailyNoteSaveTimeout();
    clearDailyNoteSavedStatusTimeout();
  });

  function handleDailyNoteBodyChange(bodyHtml: string) {
    dailyNoteHtml = bodyHtml;
    scheduleDailyNoteSave(bodyHtml);
  }

  async function startTodayNote() {
    const todayDate = formatLocalDate(new Date());

    if (todayDate <= activeNoteDate) {
      return;
    }

    await saveCurrentDailyNoteImmediately();

    activeNoteDate = todayDate;
    currentDate = todayDate;
    activeDailyNote = await loadDailyNote(activeNoteDate);
    dailyNoteHtml = activeDailyNote?.bodyHtml ?? "";
    dailyNoteSaveStatus = activeDailyNote ? "idle" : "error";
  }

  async function loadDailyNote(noteDate: string) {
    try {
      return await getOrCreateDailyNote(noteDate, Date.now());
    } catch (error) {
      console.warn("DailyNote load failed", error);
      return null;
    }
  }

  function scheduleDailyNoteSave(bodyHtml: string) {
    if (!activeDailyNote) {
      return;
    }

    showDailyNoteSaveStatus("saving");
    clearDailyNoteSaveTimeout();

    dailyNoteSaveTimeout = setTimeout(() => {
      void saveDailyNoteBody(bodyHtml);
    }, 500);
  }

  async function saveDailyNoteBody(bodyHtml: string) {
    if (!activeDailyNote) {
      return;
    }

    try {
      activeDailyNote = await updateDailyNoteBody(
        activeDailyNote.id,
        bodyHtml,
        Date.now(),
      );
      showDailyNoteSaveStatus("saved");
    } catch (error) {
      showDailyNoteSaveStatus("error");
      console.warn("DailyNote save failed", error);
    }
  }

  function clearDailyNoteSaveTimeout() {
    if (!dailyNoteSaveTimeout) {
      return;
    }

    clearTimeout(dailyNoteSaveTimeout);
    dailyNoteSaveTimeout = null;
  }

  function showDailyNoteSaveStatus(status: DailyNoteSaveStatus) {
    clearDailyNoteSavedStatusTimeout();
    dailyNoteSaveStatus = status;

    if (status !== "saved") {
      return;
    }

    dailyNoteSavedStatusTimeout = setTimeout(() => {
      dailyNoteSaveStatus = "idle";
      dailyNoteSavedStatusTimeout = null;
    }, 3_000);
  }

  function clearDailyNoteSavedStatusTimeout() {
    if (!dailyNoteSavedStatusTimeout) {
      return;
    }

    clearTimeout(dailyNoteSavedStatusTimeout);
    dailyNoteSavedStatusTimeout = null;
  }

  async function saveCurrentDailyNoteImmediately() {
    clearDailyNoteSaveTimeout();

    if (!activeDailyNote) {
      return;
    }

    showDailyNoteSaveStatus("saving");
    await saveDailyNoteBody(dailyNoteHtml);
  }

  function stopDateCheck() {
    if (!dateCheckInterval) {
      return;
    }

    clearInterval(dateCheckInterval);
    dateCheckInterval = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    const appCommand = appCommandFromKeydown(event);

    if (!appCommand) {
      return;
    }

    event.preventDefault();
    keyboardShortcutsOpen = !keyboardShortcutsOpen;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="app-shell" aria-label="koko workspace">
  <div class="workspace">
    <DailyNotePanel
      bodyHtml={dailyNoteHtml}
      canStartTodayNote={canStartTodayNote}
      dateLabel={activeNoteDateLabel}
      saveStatus={dailyNoteSaveStatus}
      onBodyChange={handleDailyNoteBodyChange}
      onStartTodayNote={startTodayNote}
    />

    <aside class="side-panel" aria-label="Sidebar">
      <PomodoroPanel />
      <PinsPanel />
    </aside>
  </div>
</main>

<KeyboardShortcutsDialog
  open={keyboardShortcutsOpen}
  onClose={() => {
    keyboardShortcutsOpen = false;
  }}
/>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(html),
  :global(body) {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  :global(body) {
    margin: 0;
    color: #20211f;
    background: #f4f1ea;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      "Segoe UI", sans-serif;
  }

  :global(button),
  :global(textarea) {
    font: inherit;
  }

  :global(button) {
    min-height: 34px;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-radius: 6px;
    background: #2e332a;
    color: #fffdf8;
    cursor: pointer;
    padding: 0 12px;
  }

  :global(button:hover) {
    background: #22271f;
  }

  :global(button:focus-visible),
  :global(textarea:focus-visible),
  :global(.daily-note-editor:focus-visible) {
    outline: 2px solid #6f8f4e;
    outline-offset: 2px;
  }

  :global(textarea) {
    width: 100%;
    resize: none;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 6px;
    background: #fffdf8;
    color: #20211f;
    line-height: 1.5;
  }

  .app-shell {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(14.5rem, 32vw, 18.5rem);
    gap: 0.8rem;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    padding: 0.8rem;
    overflow: hidden;
  }

  .side-panel {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    gap: 0.8rem;
    overflow: hidden;
  }
</style>
