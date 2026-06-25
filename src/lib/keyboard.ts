export type PomodoroCommand = "toggle" | "reset";

export function pomodoroCommandFromKeydown(
  event: KeyboardEvent,
): PomodoroCommand | null {
  if (!event.metaKey || !event.shiftKey || event.ctrlKey || event.altKey) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === "p") {
    return "toggle";
  }

  if (key === "r") {
    return "reset";
  }

  return null;
}
