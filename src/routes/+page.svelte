<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { Editor } from "@tiptap/core";
  import Pause from "@lucide/svelte/icons/pause";
  import Play from "@lucide/svelte/icons/play";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import {
    getOrCreateDailyNote,
    updateDailyNoteBody,
    type DailyNote,
  } from "$lib/api/dailyNotes";
  import {
    archivePin as archivePersistedPin,
    createPin as createPersistedPin,
    listPins,
    type Pin,
    updatePinBody,
  } from "$lib/api/pins";
  import {
    pinCommandFromKeydown,
    pomodoroCommandFromKeydown,
  } from "$lib/keyboard";
  import {
    formatTime,
    initialPomodoroState,
    pomodoroPrimaryActionLabel,
    pomodoroStatus,
    resetPomodoro,
    tickPomodoro,
    togglePomodoro,
    type PomodoroState,
  } from "$lib/pomodoro/timer";

  const today = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
  const activeNoteDate = formatLocalDate(new Date());

  let editorElement = $state<HTMLDivElement>();
  let dailyNoteHtml = $state("");
  let editor: Editor | null = null;
  let activeDailyNote = $state<DailyNote | null>(null);
  let pomodoroState = $state<PomodoroState>(initialPomodoroState());
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let dailyNoteSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let pins = $state<Pin[]>([]);
  let newPinBody = $state("");
  let newPinTextareaElement = $state<HTMLTextAreaElement>();
  let pinListElement = $state<HTMLDivElement>();
  let selectedPinId = $state<number | null>(null);
  let editingPinId = $state<number | null>(null);
  let editingPinBody = $state("");
  const formattedRemainingTime = $derived(
    formatTime(pomodoroState.remainingSeconds),
  );
  const timerStatus = $derived(pomodoroStatus(pomodoroState));
  const timerActionLabel = $derived(pomodoroPrimaryActionLabel(pomodoroState));

  onMount(async () => {
    if (!editorElement || editor) {
      return;
    }

    activeDailyNote = await loadActiveDailyNote();
    dailyNoteHtml = activeDailyNote?.bodyHtml ?? "";
    pins = await loadPins();

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
      content: dailyNoteHtml,
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
        const bodyHtml = updatedEditor.getHTML();

        dailyNoteHtml = bodyHtml;
        scheduleDailyNoteSave(bodyHtml);
      },
    });
  });

  onDestroy(() => {
    stopTimer();
    clearDailyNoteSaveTimeout();
    editor?.destroy();
    editor = null;
  });

  async function createPin() {
    const body = newPinBody.trim();

    if (!body) {
      return;
    }

    if (!isTauriRuntime()) {
      pins = [
        {
          id: Date.now(),
          body,
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
          archivedAtMs: null,
        },
        ...pins,
      ];
      newPinBody = "";
      return;
    }

    try {
      const pin = await createPersistedPin(body, Date.now());

      pins = [pin, ...pins];
      selectedPinId = pin.id;
      newPinBody = "";
    } catch (error) {
      console.warn("Pin create failed", error);
    }
  }

  async function archivePin(id: number) {
    if (!isTauriRuntime()) {
      pins = pins.filter((pin) => pin.id !== id);
      ensureSelectedPin();
      return;
    }

    try {
      await archivePersistedPin(id, Date.now());
      pins = pins.filter((pin) => pin.id !== id);
      ensureSelectedPin();
    } catch (error) {
      console.warn("Pin archive failed", error);
    }
  }

  function startEditingPin(pin: Pin) {
    selectedPinId = pin.id;
    editingPinId = pin.id;
    editingPinBody = pin.body;
  }

  function cancelEditingPin() {
    editingPinId = null;
    editingPinBody = "";
  }

  async function saveEditingPin() {
    if (editingPinId === null) {
      return;
    }

    const body = editingPinBody.trim();

    if (!body) {
      return;
    }

    if (!isTauriRuntime()) {
      pins = pins.map((pin) =>
        pin.id === editingPinId
          ? { ...pin, body, updatedAtMs: Date.now() }
          : pin,
      );
      cancelEditingPin();
      return;
    }

    try {
      const updatedPin = await updatePinBody(editingPinId, body, Date.now());

      pins = pins.map((pin) => (pin.id === updatedPin.id ? updatedPin : pin));
      cancelEditingPin();
    } catch (error) {
      console.warn("Pin update failed", error);
    }
  }

  async function loadPins() {
    if (!isTauriRuntime()) {
      return [];
    }

    try {
      return await listPins();
    } catch (error) {
      console.warn("Pins load failed", error);
      return [];
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    const pomodoroCommand = pomodoroCommandFromKeydown(event);

    if (pomodoroCommand) {
      event.preventDefault();

      if (pomodoroCommand === "toggle") {
        toggleTimer();
        return;
      }

      resetTimer();
      return;
    }

    const pinCommand = pinCommandFromKeydown(event);

    if (!pinCommand) {
      return;
    }

    if (pinCommand !== "focusCreate" && !pinsPanelContainsFocus()) {
      return;
    }

    if (pinCommand !== "focusCreate" && isTextInputTarget(event.target)) {
      return;
    }

    event.preventDefault();
    handlePinCommand(pinCommand);
  }

  function handlePinCommand(command: ReturnType<typeof pinCommandFromKeydown>) {
    switch (command) {
      case "focusCreate":
        newPinTextareaElement?.focus();
        break;
      case "moveDown":
        movePinSelection(1);
        break;
      case "moveUp":
        movePinSelection(-1);
        break;
      case "editSelected":
        editSelectedPin();
        break;
      case "archiveSelected":
        void archiveSelectedPin();
        break;
    }
  }

  function toggleTimer() {
    pomodoroState = togglePomodoro(pomodoroState);
    syncTimerInterval();
  }

  function resetTimer() {
    pomodoroState = resetPomodoro(pomodoroState.durationSeconds);
    stopTimer();
  }

  function syncTimerInterval() {
    if (!pomodoroState.running) {
      stopTimer();
      return;
    }

    if (timerInterval) {
      return;
    }

    timerInterval = setInterval(() => {
      const result = tickPomodoro(pomodoroState);

      pomodoroState = result.state;

      if (result.completed) {
        stopTimer();
      }
    }, 1000);
  }

  function stopTimer() {
    if (!timerInterval) {
      return;
    }

    clearInterval(timerInterval);
    timerInterval = null;
  }

  async function loadActiveDailyNote() {
    if (!isTauriRuntime()) {
      return null;
    }

    try {
      return await getOrCreateDailyNote(activeNoteDate, Date.now());
    } catch (error) {
      console.warn("DailyNote load failed", error);
      return null;
    }
  }

  function scheduleDailyNoteSave(bodyHtml: string) {
    if (!activeDailyNote || !isTauriRuntime()) {
      return;
    }

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
    } catch (error) {
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

  function movePinSelection(delta: number) {
    if (pins.length === 0) {
      selectedPinId = null;
      return;
    }

    const currentIndex = Math.max(
      0,
      pins.findIndex((pin) => pin.id === selectedPinId),
    );
    const nextIndex = Math.min(
      pins.length - 1,
      Math.max(0, currentIndex + delta),
    );

    selectedPinId = pins[nextIndex].id;
  }

  function editSelectedPin() {
    const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? pins[0];

    if (selectedPin) {
      startEditingPin(selectedPin);
    }
  }

  async function archiveSelectedPin() {
    const selectedPin = pins.find((pin) => pin.id === selectedPinId);

    if (selectedPin) {
      await archivePin(selectedPin.id);
    }
  }

  function ensureSelectedPin() {
    if (pins.some((pin) => pin.id === selectedPinId)) {
      return;
    }

    selectedPinId = pins[0]?.id ?? null;
  }

  function selectPin(id: number) {
    selectedPinId = id;
  }

  function pinsPanelContainsFocus() {
    const activeElement = document.activeElement;

    return activeElement instanceof Node && pinListElement?.contains(activeElement);
  }

  function isTextInputTarget(target: EventTarget | null) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }

  function formatLocalDate(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function isTauriRuntime() {
    return "__TAURI_INTERNALS__" in window;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="app-shell" aria-label="koko workspace">
  <div class="workspace">
    <section class="note-panel" aria-label="DailyNote editor">
      <header class="panel-header note-header">
        <h1>{today}</h1>
        <button type="button">Start today's note</button>
      </header>

      <div
        class="daily-note"
        bind:this={editorElement}
        data-empty={dailyNoteHtml.length === 0}
      ></div>
    </section>

    <aside class="side-panel" aria-label="Sidebar">
      <section class="timer-panel" aria-label="Pomodoro">
        <header class="panel-header">
          <h2>Pomodoro</h2>
        </header>

        <div
          class="timer-face"
          aria-label={`${formattedRemainingTime} remaining`}
        >
          <div class="timer-copy">
            <span>{formattedRemainingTime}</span>
            <small>{timerStatus}</small>
          </div>

          <div class="timer-actions" aria-label="Pomodoro controls">
            <button
              class="icon-button"
              type="button"
              aria-label={timerActionLabel}
              title={`${timerActionLabel} (Cmd+Shift+P)`}
              onclick={toggleTimer}
            >
              {#if pomodoroState.running}
                <Pause size={16} strokeWidth={2.2} aria-hidden="true" />
              {:else}
                <Play size={16} strokeWidth={2.2} aria-hidden="true" />
              {/if}
            </button>
            <button
              class="icon-button"
              type="button"
              aria-label="Reset"
              title="Reset (Cmd+Shift+R)"
              onclick={resetTimer}
            >
              <RotateCcw size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section class="pins-panel" aria-label="Pins">
        <header class="panel-header">
          <h2>Pins</h2>
        </header>

        <form
          class="pin-form"
          onsubmit={(event) => {
            event.preventDefault();
            createPin();
          }}
        >
          <textarea
            bind:this={newPinTextareaElement}
            bind:value={newPinBody}
            rows="3"
            placeholder="Pin a monthly goal, reminder, or idea..."
            aria-label="New pin"
          ></textarea>
          <button type="submit">Pin</button>
        </form>

        <div
          class="pin-list"
          aria-label="Active pins"
          aria-activedescendant={selectedPinId
            ? `pin-${selectedPinId}`
            : undefined}
          bind:this={pinListElement}
          role="listbox"
          tabindex="0"
        >
          {#if pins.length === 0}
            <p class="empty-state">No pins yet.</p>
          {:else}
            {#each pins as pin (pin.id)}
              <div
                id={`pin-${pin.id}`}
                class="pin"
                class:pin-selected={selectedPinId === pin.id}
                aria-selected={selectedPinId === pin.id}
                onfocusin={() => selectPin(pin.id)}
                role="option"
              >
                {#if editingPinId === pin.id}
                  <textarea
                    bind:value={editingPinBody}
                    rows="3"
                    aria-label="Edit pin"
                  ></textarea>
                  <div class="pin-actions">
                    <button type="button" onclick={saveEditingPin}>Save</button>
                    <button type="button" onclick={cancelEditingPin}>
                      Cancel
                    </button>
                  </div>
                {:else}
                  <p>{pin.body}</p>
                  <div class="pin-actions">
                    <button type="button" onclick={() => startEditingPin(pin)}>
                      Edit
                    </button>
                    <button type="button" onclick={() => archivePin(pin.id)}>
                      Archive
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </section>
    </aside>
  </div>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    min-width: 860px;
    min-height: 640px;
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

  .app-shell {
    min-height: 100vh;
  }

  .workspace,
  .side-panel,
  .pins-panel,
  .note-panel,
  .timer-panel,
  .pin,
  .pin-form {
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: rgba(255, 252, 246, 0.82);
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 18.5rem;
    gap: 0.8rem;
    min-height: 100vh;
    padding: 0.8rem;
    border: 0;
    background: transparent;
  }

  .side-panel,
  .pins-panel,
  .note-panel,
  .timer-panel {
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding: 0.9rem;
  }

  .note-panel {
    gap: 0.85rem;
    background: #fffdf8;
  }

  .side-panel {
    gap: 0.8rem;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .pins-panel,
  .timer-panel {
    gap: 12px;
  }

  .pins-panel {
    flex: 1;
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

  h1,
  h2 {
    margin: 0;
    font-weight: 720;
    line-height: 1.1;
  }

  h1 {
    font-size: 1.35rem;
  }

  h2 {
    font-size: 1rem;
  }

  button {
    min-height: 34px;
    border: 1px solid rgba(43, 41, 36, 0.16);
    border-radius: 6px;
    background: #2e332a;
    color: #fffdf8;
    cursor: pointer;
    padding: 0 12px;
  }

  button:hover {
    background: #22271f;
  }

  button:focus-visible,
  textarea:focus-visible,
  :global(.daily-note-editor:focus-visible) {
    outline: 2px solid #6f8f4e;
    outline-offset: 2px;
  }

  textarea {
    width: 100%;
    resize: none;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 6px;
    background: #fffdf8;
    color: #20211f;
    line-height: 1.5;
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

  .pin-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
  }

  .pin-form textarea {
    min-height: 72px;
    padding: 10px;
  }

  .pin-form button,
  .timer-actions button {
    align-self: flex-start;
  }

  .pin-list {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 10px;
    overflow: auto;
  }

  .pin {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: #fff4bf;
  }

  .pin-selected {
    border-color: rgba(89, 113, 62, 0.7);
    box-shadow: 0 0 0 1px rgba(89, 113, 62, 0.22);
  }

  .pin p,
  .empty-state {
    margin: 0;
    color: #4a4438;
    font-size: 0.9rem;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  .pin button {
    align-self: flex-start;
    background: transparent;
    color: #4a4438;
  }

  .pin button:hover {
    background: rgba(74, 68, 56, 0.08);
  }

  .pin textarea {
    min-height: 76px;
    padding: 9px;
    background: rgba(255, 253, 248, 0.76);
  }

  .pin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .timer-face {
    display: flex;
    min-height: 84px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: #fffdf8;
  }

  .timer-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }

  .timer-face span {
    font-variant-numeric: tabular-nums;
    font-size: 1.9rem;
    font-weight: 740;
    line-height: 1;
  }

  .timer-face small {
    color: #6d675d;
    font-size: 0.8rem;
  }

  .timer-actions {
    display: flex;
    gap: 8px;
  }

  .icon-button {
    display: inline-flex;
    width: 34px;
    min-width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
</style>
