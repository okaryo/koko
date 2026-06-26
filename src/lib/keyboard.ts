export type PomodoroCommand = "toggle" | "reset";
export type PinCommand =
  | "focusCreate"
  | "moveDown"
  | "moveUp"
  | "editSelected"
  | "archiveSelected";

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

export function pinCommandFromKeydown(event: KeyboardEvent): PinCommand | null {
  if (event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey) {
    return event.key.toLowerCase() === "i" ? "focusCreate" : null;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }

  if (event.shiftKey) {
    return event.key.toLowerCase() === "d" ? "archiveSelected" : null;
  }

  switch (event.key) {
    case "j":
    case "ArrowDown":
      return "moveDown";
    case "k":
    case "ArrowUp":
      return "moveUp";
    case "e":
      return "editSelected";
    default:
      return null;
  }
}
