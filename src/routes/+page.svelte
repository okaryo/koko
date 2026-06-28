<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { check, type Update } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import {
    getDailyNote,
    getDailyNoteNavigation,
    getOrCreateDailyNote,
    updateDailyNoteBody,
    type DailyNote,
    type DailyNoteNavigation,
  } from "$lib/api/dailyNotes";
  import DailyNotePanel from "$lib/components/DailyNotePanel.svelte";
  import KeyboardShortcutsDialog from "$lib/components/KeyboardShortcutsDialog.svelte";
  import PomodoroPanel from "$lib/components/PomodoroPanel.svelte";
  import StickyNotesPanel from "$lib/components/StickyNotesPanel.svelte";
  import { formatDateLabel, formatLocalDate } from "$lib/date";
  import { appCommandFromKeydown } from "$lib/keyboard";

  type DailyNoteSaveStatus = "idle" | "saving" | "saved" | "error";
  type UpdateState =
    | "unavailable"
    | "checking"
    | "idle"
    | "available"
    | "installing"
    | "error";

  const UPDATE_CHECK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  let dailyNoteHtml = $state("");
  let activeDailyNote = $state<DailyNote | null>(null);
  let activeNoteDate = $state(formatLocalDate(new Date()));
  let currentDate = $state(formatLocalDate(new Date()));
  let dailyNoteSaveStatus = $state<DailyNoteSaveStatus>("idle");
  let dailyNoteNavigation = $state<DailyNoteNavigation>({
    previousNoteDate: null,
    nextNoteDate: null,
  });
  let todayDailyNoteExists = $state(true);
  let keyboardShortcutsOpen = $state(false);
  let dateCheckInterval: ReturnType<typeof setInterval> | null = null;
  let dailyNoteSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let dailyNoteSavedStatusTimeout: ReturnType<typeof setTimeout> | null = null;
  let updateState = $state<UpdateState>("unavailable");
  let availableUpdate = $state<Update | null>(null);
  let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
  let unlistenUpdateFocusChange: (() => void) | null = null;
  let updateCheckInFlight = false;
  let lastUpdateCheckAttemptAt = 0;
  const activeNoteDateLabel = $derived(formatDateLabel(activeNoteDate));
  const dailyNotePanelKey = $derived(
    activeDailyNote ? `daily-note:${activeDailyNote.id}` : activeNoteDate,
  );

  onMount(async () => {
    activeDailyNote = await loadDailyNote(activeNoteDate);
    dailyNoteHtml = activeDailyNote?.bodyHtml ?? "";
    dailyNoteSaveStatus = activeDailyNote ? "idle" : "error";
    await refreshDailyNoteNavigation();
    await refreshTodayDailyNoteExists();
    dateCheckInterval = setInterval(() => {
      void refreshCurrentDate();
    }, 60_000);
    startUpdateChecks();
  });

  onDestroy(() => {
    stopDateCheck();
    stopUpdateChecks();
    clearDailyNoteSaveTimeout();
    clearDailyNoteSavedStatusTimeout();
  });

  function handleDailyNoteBodyChange(bodyHtml: string) {
    dailyNoteHtml = bodyHtml;
    scheduleDailyNoteSave(bodyHtml);
  }

  async function goToExistingTodayNote() {
    if (currentDate === activeNoteDate || !todayDailyNoteExists) {
      return;
    }

    await saveCurrentDailyNoteImmediately();

    const todayDailyNote = await loadExistingDailyNote(currentDate);

    if (!todayDailyNote) {
      todayDailyNoteExists = false;
      return;
    }

    setActiveDailyNote(todayDailyNote);
    await refreshDailyNoteNavigation();
    await refreshTodayDailyNoteExists();
  }

  async function startTodayNote() {
    if (currentDate === activeNoteDate) {
      return;
    }

    await saveCurrentDailyNoteImmediately();

    const todayDailyNote = await loadDailyNote(currentDate);

    if (!todayDailyNote) {
      dailyNoteSaveStatus = "error";
      return;
    }

    todayDailyNoteExists = true;
    setActiveDailyNote(todayDailyNote);
    await refreshDailyNoteNavigation();
  }

  async function loadDailyNote(noteDate: string) {
    try {
      return await getOrCreateDailyNote(noteDate, Date.now());
    } catch (error) {
      console.warn("DailyNote load failed", error);
      return null;
    }
  }

  async function loadExistingDailyNote(noteDate: string) {
    try {
      return await getDailyNote(noteDate);
    } catch (error) {
      console.warn("DailyNote load failed", error);
      return null;
    }
  }

  async function refreshDailyNoteNavigation() {
    try {
      dailyNoteNavigation = await getDailyNoteNavigation(activeNoteDate);
    } catch (error) {
      console.warn("DailyNote navigation load failed", error);
      dailyNoteNavigation = {
        previousNoteDate: null,
        nextNoteDate: null,
      };
    }
  }

  async function refreshTodayDailyNoteExists() {
    if (activeNoteDate === currentDate) {
      todayDailyNoteExists = true;
      return;
    }

    todayDailyNoteExists = (await loadExistingDailyNote(currentDate)) !== null;
  }

  async function refreshCurrentDate() {
    const nextCurrentDate = formatLocalDate(new Date());

    if (nextCurrentDate !== currentDate) {
      currentDate = nextCurrentDate;
    }

    await refreshTodayDailyNoteExists();
  }

  async function goToAdjacentDailyNote(noteDate: string | null) {
    if (!noteDate || noteDate === activeNoteDate) {
      return;
    }

    await saveCurrentDailyNoteImmediately();

    const dailyNote = await loadExistingDailyNote(noteDate);

    if (!dailyNote) {
      await refreshDailyNoteNavigation();
      return;
    }

    setActiveDailyNote(dailyNote);
    await refreshDailyNoteNavigation();
    await refreshTodayDailyNoteExists();
  }

  function setActiveDailyNote(dailyNote: DailyNote) {
    activeDailyNote = dailyNote;
    activeNoteDate = dailyNote.noteDate;
    dailyNoteHtml = dailyNote.bodyHtml;
    dailyNoteSaveStatus = "idle";
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

  function startUpdateChecks() {
    if (!isTauriRuntime()) {
      updateState = "unavailable";
      return;
    }

    void checkForUpdates({ force: true });
    updateCheckInterval = setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_COOLDOWN_MS);

    void getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          void checkForUpdates();
        }
      })
      .then((unlisten) => {
        unlistenUpdateFocusChange = unlisten;
      })
      .catch((error) => {
        console.warn("Update focus listener setup failed", error);
      });
  }

  function stopUpdateChecks() {
    if (updateCheckInterval) {
      clearInterval(updateCheckInterval);
      updateCheckInterval = null;
    }

    unlistenUpdateFocusChange?.();
    unlistenUpdateFocusChange = null;
  }

  async function checkForUpdates(options: { force?: boolean } = {}) {
    if (!isTauriRuntime()) {
      updateState = "unavailable";
      return;
    }

    if (shouldSkipUpdateCheck(options.force ?? false)) {
      return;
    }

    updateCheckInFlight = true;
    lastUpdateCheckAttemptAt = Date.now();
    updateState = "checking";

    try {
      const update = await check();

      availableUpdate = update;
      updateState = update ? "available" : "idle";
    } catch (error) {
      console.warn("Update check failed", error);
      updateState = "error";
    } finally {
      updateCheckInFlight = false;
    }
  }

  function shouldSkipUpdateCheck(force: boolean) {
    if (
      updateCheckInFlight ||
      updateState === "available" ||
      updateState === "installing"
    ) {
      return true;
    }

    return (
      !force && Date.now() - lastUpdateCheckAttemptAt < UPDATE_CHECK_COOLDOWN_MS
    );
  }

  async function installUpdate() {
    if (!availableUpdate) {
      return;
    }

    updateState = "installing";

    try {
      await availableUpdate.downloadAndInstall();
      await relaunch();
    } catch (error) {
      console.warn("Update installation failed", error);
      updateState = "error";
    }
  }

  function isTauriRuntime() {
    return "__TAURI_INTERNALS__" in window;
  }

  function handleKeydown(event: KeyboardEvent) {
    const appCommand = appCommandFromKeydown(event);

    if (!appCommand) {
      return;
    }

    event.preventDefault();

    if (appCommand === "toggleKeyboardHelp") {
      keyboardShortcutsOpen = !keyboardShortcutsOpen;
      return;
    }

    if (keyboardShortcutsOpen) {
      return;
    }

    if (appCommand === "goToPreviousDailyNote") {
      void goToAdjacentDailyNote(dailyNoteNavigation.previousNoteDate);
      return;
    }

    void goToAdjacentDailyNote(dailyNoteNavigation.nextNoteDate);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="app-shell" aria-label="koko workspace">
  <div class="workspace">
    {#key dailyNotePanelKey}
      <DailyNotePanel
        bodyHtml={dailyNoteHtml}
        dateLabel={activeNoteDateLabel}
        isToday={activeNoteDate === currentDate}
        nextNoteDate={dailyNoteNavigation.nextNoteDate}
        previousNoteDate={dailyNoteNavigation.previousNoteDate}
        saveStatus={dailyNoteSaveStatus}
        {todayDailyNoteExists}
        onBodyChange={handleDailyNoteBodyChange}
        onGoToNextNote={() =>
          void goToAdjacentDailyNote(dailyNoteNavigation.nextNoteDate)}
        onGoToPreviousNote={() =>
          void goToAdjacentDailyNote(dailyNoteNavigation.previousNoteDate)}
        onGoToTodayNote={goToExistingTodayNote}
        onStartTodayNote={startTodayNote}
      />
    {/key}

    <aside class="side-panel" aria-label="Sidebar">
      <PomodoroPanel />
      <StickyNotesPanel />
      {#if updateState === "available" || updateState === "installing"}
        <button
          class="update-button"
          type="button"
          disabled={updateState === "installing"}
          onclick={() => void installUpdate()}
        >
          {updateState === "installing"
            ? "Installing update..."
            : "Install update"}
        </button>
      {/if}
    </aside>
  </div>

  <button
    class="keyboard-shortcuts-button"
    type="button"
    title="Keyboard shortcuts"
    aria-label="Keyboard shortcuts"
    onclick={() => {
      keyboardShortcutsOpen = true;
    }}
  >
    <Keyboard size={16} strokeWidth={2.2} aria-hidden="true" />
  </button>
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
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
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
    position: relative;
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

  .keyboard-shortcuts-button {
    position: absolute;
    bottom: 1.2rem;
    right: 0;
    z-index: 5;
    display: inline-flex;
    width: 34px;
    min-width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-color: rgba(43, 41, 36, 0.14);
    border-right: 0;
    border-radius: 6px 0 0 6px;
    background: rgba(255, 253, 248, 0.88);
    color: #4a4438;
    box-shadow: 0 6px 20px rgba(43, 41, 36, 0.12);
    transform: translateX(24px);
    transition:
      background 120ms ease,
      color 120ms ease,
      transform 140ms ease;
  }

  .keyboard-shortcuts-button:hover,
  .keyboard-shortcuts-button:focus-visible {
    background: #fffdf8;
    color: #20211f;
    transform: translateX(0);
  }

  .update-button {
    flex: 0 0 auto;
    width: 100%;
    border-color: rgba(43, 41, 36, 0.16);
  }

  .update-button:hover:not(:disabled) {
    background: #22271f;
  }

  .update-button:disabled {
    cursor: wait;
    opacity: 0.75;
  }
</style>
