export type PomodoroCommand = "toggle" | "reset";
export type DailyNoteCommand = "focus" | "insertTimestamp" | "copyMarkdown";
export type AppCommand = "toggleKeyboardHelp";
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

export function dailyNoteCommandFromKeydown(
  event: KeyboardEvent,
): DailyNoteCommand | null {
  if (
    event.metaKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    event.key.toLowerCase() === "n"
  ) {
    return "focus";
  }

  if (
    event.metaKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    event.key.toLowerCase() === "c"
  ) {
    return "copyMarkdown";
  }

  if (
    event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "t"
  ) {
    return "insertTimestamp";
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

export function appCommandFromKeydown(event: KeyboardEvent): AppCommand | null {
  if (
    event.metaKey &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    event.key === "/"
  ) {
    return "toggleKeyboardHelp";
  }

  return null;
}

export function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
