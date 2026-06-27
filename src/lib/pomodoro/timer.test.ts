import { describe, expect, it } from "vitest";
import {
  formatTime,
  initialPomodoroState,
  pomodoroPrimaryActionLabel,
  pomodoroStatus,
  resetPomodoro,
  tickPomodoro,
  togglePomodoro,
} from "./timer";

describe("pomodoro timer", () => {
  it("starts, pauses, and continues", () => {
    const ready = initialPomodoroState(1500);
    const running = togglePomodoro(ready);
    const paused = togglePomodoro({ ...running, remainingSeconds: 1490 });
    const continued = togglePomodoro(paused);

    expect(running).toEqual({
      remainingSeconds: 1500,
      durationSeconds: 1500,
      running: true,
    });
    expect(paused).toEqual({
      remainingSeconds: 1490,
      durationSeconds: 1500,
      running: false,
    });
    expect(continued.running).toBe(true);
    expect(continued.remainingSeconds).toBe(1490);
  });

  it("resets to the configured duration", () => {
    expect(resetPomodoro(600)).toEqual({
      remainingSeconds: 600,
      durationSeconds: 600,
      running: false,
    });
  });

  it("ticks running timers and reports completion", () => {
    const ticked = tickPomodoro({
      remainingSeconds: 2,
      durationSeconds: 1500,
      running: true,
    });
    const completed = tickPomodoro({
      remainingSeconds: 1,
      durationSeconds: 1500,
      running: true,
    });

    expect(ticked).toEqual({
      state: {
        remainingSeconds: 1,
        durationSeconds: 1500,
        running: true,
      },
      completed: false,
    });
    expect(completed).toEqual({
      state: {
        remainingSeconds: 1500,
        durationSeconds: 1500,
        running: false,
      },
      completed: true,
    });
  });

  it("formats status, action labels, and time", () => {
    expect(pomodoroStatus(initialPomodoroState(1500))).toBe("Ready");
    expect(
      pomodoroStatus({
        remainingSeconds: 1490,
        durationSeconds: 1500,
        running: false,
      }),
    ).toBe("Paused");
    expect(
      pomodoroPrimaryActionLabel({
        remainingSeconds: 1490,
        durationSeconds: 1500,
        running: false,
      }),
    ).toBe("Continue");
    expect(formatTime(65)).toBe("1:05");
  });
});
