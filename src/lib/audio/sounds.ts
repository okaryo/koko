export type SoundAsset = {
  id: string;
  label: string;
  src: string;
};

export const pomodoroSounds = {
  focusTick: {
    id: "tick",
    label: "Tick",
    src: "/sounds/pomodoro/focus-tick.mp3",
  },
  focusTock: {
    id: "tock",
    label: "Tock",
    src: "/sounds/pomodoro/focus-tock.mp3",
  },
  completion: {
    id: "complete",
    label: "Complete",
    src: "/sounds/pomodoro/complete.mp3",
  },
} as const satisfies Record<string, SoundAsset>;

export const pomodoroFocusLoopSounds = [
  pomodoroSounds.focusTick,
  pomodoroSounds.focusTock,
] as const;

export const pomodoroCompletionSounds = [pomodoroSounds.completion] as const;
