<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Bell from "@lucide/svelte/icons/bell";
  import Pause from "@lucide/svelte/icons/pause";
  import Play from "@lucide/svelte/icons/play";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
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
    tickPomodoro,
    togglePomodoro,
    type PomodoroState,
  } from "$lib/pomodoro/timer";

  let pomodoroState = $state<PomodoroState>(initialPomodoroState());
  let notificationPermissionLoaded = $state(false);
  let notificationPermissionGranted = $state(false);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  const formattedRemainingTime = $derived(
    formatTime(pomodoroState.remainingSeconds),
  );
  const timerStatus = $derived(pomodoroStatus(pomodoroState));
  const timerActionLabel = $derived(pomodoroPrimaryActionLabel(pomodoroState));

  onMount(() => {
    void loadNotificationPermission();
  });

  onDestroy(() => {
    stopTimer();
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
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="timer-panel" aria-label="Pomodoro">
  <header class="panel-header">
    <h2>Pomodoro</h2>
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
</section>

<style>
  .timer-panel {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 12px;
    padding: 0.9rem;
    border: 1px solid rgba(43, 41, 36, 0.12);
    border-radius: 8px;
    background: rgba(255, 252, 246, 0.82);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 720;
    line-height: 1.1;
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
</style>
