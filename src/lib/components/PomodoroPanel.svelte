<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Bell from "@lucide/svelte/icons/bell";
  import Pause from "@lucide/svelte/icons/pause";
  import Play from "@lucide/svelte/icons/play";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import {
    getSettings,
    updatePomodoroTimerSettings,
    updatePomodoroVolumeSettings,
  } from "$lib/api/settings";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import { createKokoAudio, createKokoAudioSequence } from "$lib/audio/player";
  import {
    pomodoroCompletionSounds,
    pomodoroFocusLoopSounds,
  } from "$lib/audio/sounds";
  import { pomodoroCommandFromKeydown } from "$lib/keyboard";
  import {
    isNotificationPermissionGranted,
    requestNotificationPermission,
    sendPomodoroCompleteNotification,
  } from "$lib/notifications";
  import {
    formatTime,
    initialPomodoroState,
    pomodoroPrimaryActionLabel,
    pomodoroStatus,
    resetPomodoro,
    setPomodoroDuration,
    tickPomodoro,
    togglePomodoro,
    type PomodoroState,
  } from "$lib/pomodoro/timer";

  const DEFAULT_FOCUS_DURATION_MINUTES = 25;
  const MIN_FOCUS_DURATION_MINUTES = 1;
  const MAX_FOCUS_DURATION_MINUTES = 60;
  const DEFAULT_FOCUS_VOLUME_PERCENT = 100;
  const DEFAULT_COMPLETION_VOLUME_PERCENT = 100;

  let pomodoroState = $state<PomodoroState>(initialPomodoroState());
  let notificationPermissionLoaded = $state(false);
  let notificationPermissionGranted = $state(false);
  let soundSettingsOpen = $state(false);
  let focusDurationMinutes = $state(DEFAULT_FOCUS_DURATION_MINUTES);
  let focusVolumePercent = $state(DEFAULT_FOCUS_VOLUME_PERCENT);
  let completionVolumePercent = $state(DEFAULT_COMPLETION_VOLUME_PERCENT);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let durationSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let volumeSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let settingsLoaded = false;
  const focusLoopAudio = createKokoAudioSequence({
    sources: pomodoroFocusLoopSounds.map((sound) => sound.src),
    volume: volumePercentToAudioVolume(DEFAULT_FOCUS_VOLUME_PERCENT),
    failureMessage: "Failed to play Pomodoro focus sound.",
  });
  const completionAudio = createKokoAudio({
    src: pomodoroCompletionSounds[0].src,
    volume: volumePercentToAudioVolume(DEFAULT_COMPLETION_VOLUME_PERCENT),
    failureMessage: "Failed to play Pomodoro completion sound.",
  });
  const formattedRemainingTime = $derived(
    formatTime(pomodoroState.remainingSeconds),
  );
  const timerStatus = $derived(pomodoroStatus(pomodoroState));
  const timerActionLabel = $derived(pomodoroPrimaryActionLabel(pomodoroState));

  onMount(() => {
    void loadNotificationPermission();
    void loadSettings();
  });

  onDestroy(() => {
    stopTimer();
    clearDurationSaveTimeout();
    clearVolumeSaveTimeout();
    focusLoopAudio.dispose();
    completionAudio.dispose();
  });

  $effect(() => {
    const durationSeconds = durationMinutesToSeconds(focusDurationMinutes);

    pomodoroState = setPomodoroDuration(pomodoroState, durationSeconds);

    if (settingsLoaded) {
      scheduleDurationSave();
    }
  });

  $effect(() => {
    focusLoopAudio.setVolume(volumePercentToAudioVolume(focusVolumePercent));

    if (settingsLoaded) {
      scheduleVolumeSave();
    }
  });

  $effect(() => {
    completionAudio.setVolume(
      volumePercentToAudioVolume(completionVolumePercent),
    );

    if (settingsLoaded) {
      scheduleVolumeSave();
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    const pomodoroCommand = pomodoroCommandFromKeydown(event);

    if (!pomodoroCommand) {
      return;
    }

    event.preventDefault();

    if (pomodoroCommand === "toggle") {
      toggleTimer();
      return;
    }

    resetTimer();
  }

  function toggleTimer() {
    pomodoroState = togglePomodoro(pomodoroState);
    syncTimerInterval();
  }

  function resetTimer() {
    pomodoroState = resetPomodoro(pomodoroState.durationSeconds);
    focusLoopAudio.stop();
    stopTimer();
  }

  function syncTimerInterval() {
    if (!pomodoroState.running) {
      focusLoopAudio.stop();
      stopTimer();
      return;
    }

    focusLoopAudio.play();

    if (timerInterval) {
      return;
    }

    timerInterval = setInterval(() => {
      const result = tickPomodoro(pomodoroState);

      pomodoroState = result.state;

      if (result.completed) {
        focusLoopAudio.stop();
        stopTimer();
        completionAudio.play();
        void sendPomodoroCompleteNotification();
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

  async function loadNotificationPermission() {
    notificationPermissionGranted = await isNotificationPermissionGranted();
    notificationPermissionLoaded = true;
  }

  async function requestNotifications() {
    notificationPermissionGranted = await requestNotificationPermission();
    notificationPermissionLoaded = true;
  }

  async function loadSettings() {
    try {
      const settings = await getSettings();

      focusDurationMinutes = settings.pomodoro.focusDurationMinutes;
      focusVolumePercent = settings.pomodoro.focusVolume;
      completionVolumePercent = settings.pomodoro.completionVolume;
    } catch (error) {
      console.warn("Settings load failed", error);
    } finally {
      settingsLoaded = true;
    }
  }

  function scheduleVolumeSave() {
    clearVolumeSaveTimeout();

    volumeSaveTimeout = setTimeout(() => {
      void saveVolumeSettings();
    }, 500);
  }

  function scheduleDurationSave() {
    clearDurationSaveTimeout();

    durationSaveTimeout = setTimeout(() => {
      void saveDurationSettings();
    }, 500);
  }

  async function saveDurationSettings() {
    try {
      const settings = await updatePomodoroTimerSettings(focusDurationMinutes);

      focusDurationMinutes = settings.pomodoro.focusDurationMinutes;
    } catch (error) {
      console.warn("Settings save failed", error);
    }
  }

  async function saveVolumeSettings() {
    try {
      const settings = await updatePomodoroVolumeSettings(
        focusVolumePercent,
        completionVolumePercent,
      );

      focusVolumePercent = settings.pomodoro.focusVolume;
      completionVolumePercent = settings.pomodoro.completionVolume;
    } catch (error) {
      console.warn("Settings save failed", error);
    }
  }

  function clearDurationSaveTimeout() {
    if (!durationSaveTimeout) {
      return;
    }

    clearTimeout(durationSaveTimeout);
    durationSaveTimeout = null;
  }

  function clearVolumeSaveTimeout() {
    if (!volumeSaveTimeout) {
      return;
    }

    clearTimeout(volumeSaveTimeout);
    volumeSaveTimeout = null;
  }

  function volumePercentToAudioVolume(volumePercent: number) {
    return Math.min(100, Math.max(0, volumePercent)) / 100;
  }

  function handleFocusDurationInput(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const nextDurationMinutes = clampFocusDuration(Number(event.target.value));

    focusDurationMinutes = nextDurationMinutes;
    event.target.value = `${nextDurationMinutes}`;
  }

  function durationMinutesToSeconds(minutes: number) {
    return minutes * 60;
  }

  function clampFocusDuration(minutes: number) {
    if (!Number.isFinite(minutes)) {
      return DEFAULT_FOCUS_DURATION_MINUTES;
    }

    return Math.min(
      MAX_FOCUS_DURATION_MINUTES,
      Math.max(MIN_FOCUS_DURATION_MINUTES, Math.round(minutes)),
    );
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="timer-panel" aria-label="Pomodoro">
  <header class="panel-header">
    <h2>Pomodoro</h2>
    <div class="panel-header-actions">
      {#if notificationPermissionLoaded && !notificationPermissionGranted}
        <button
          class="icon-button subtle-icon-button"
          type="button"
          aria-label="Enable notifications"
          title="Enable notifications"
          onclick={() => void requestNotifications()}
        >
          <Bell size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      {/if}
      <button
        class="icon-button subtle-icon-button"
        class:active-icon-button={soundSettingsOpen}
        type="button"
        aria-label="Pomodoro settings"
        title="Pomodoro settings"
        aria-pressed={soundSettingsOpen}
        onclick={() => {
          soundSettingsOpen = !soundSettingsOpen;
        }}
      >
        <SlidersHorizontal size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  </header>

  <div class="timer-face" aria-label={`${formattedRemainingTime} remaining`}>
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

  {#if soundSettingsOpen}
    <div class="pomodoro-settings" aria-label="Pomodoro settings">
      <label>
        <span>Duration</span>
        <input
          type="number"
          min={MIN_FOCUS_DURATION_MINUTES}
          max={MAX_FOCUS_DURATION_MINUTES}
          step="1"
          value={focusDurationMinutes}
          aria-label="Focus duration in minutes"
          oninput={handleFocusDurationInput}
        />
        <output>min</output>
      </label>
      <label>
        <span>Focus</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={focusVolumePercent}
          aria-label="Focus sound volume"
        />
        <output>{focusVolumePercent}</output>
      </label>
      <label>
        <span>Complete</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={completionVolumePercent}
          aria-label="Completion sound volume"
        />
        <output>{completionVolumePercent}</output>
      </label>
    </div>
  {/if}
</section>

<style>
  .timer-panel {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    flex: 0 0 auto;
    gap: 12px;
    padding: 0.9rem;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: rgba(255, 252, 246, 0.82);
  }

  .panel-header {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .panel-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 720;
    line-height: 1.1;
  }

  .timer-face {
    display: flex;
    min-width: 0;
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

  .timer-actions button {
    align-self: flex-start;
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

  .subtle-icon-button {
    border-color: transparent;
    background: transparent;
    color: #4a4438;
  }

  .subtle-icon-button:hover {
    background: rgba(74, 68, 56, 0.08);
    color: #20211f;
  }

  .active-icon-button,
  .active-icon-button:hover {
    border-color: rgba(89, 113, 62, 0.24);
    background: rgba(89, 113, 62, 0.12);
    color: #20211f;
  }

  .pomodoro-settings {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 9px;
    padding: 10px;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: #fffdf8;
  }

  .pomodoro-settings label {
    display: grid;
    grid-template-columns: minmax(3.8rem, 4.4rem) minmax(0, 1fr) 2rem;
    align-items: center;
    gap: 8px;
    color: #5a5449;
    font-size: 0.8rem;
  }

  .pomodoro-settings input {
    width: 100%;
  }

  .pomodoro-settings input[type="number"] {
    min-width: 0;
    height: 28px;
    padding: 0 6px;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 6px;
    background: #fffdf8;
    color: #20211f;
    font: inherit;
  }

  .pomodoro-settings output {
    color: #6d675d;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
</style>
