export type PomodoroCommand = "toggle" | "reset";
export type DailyNoteCommand = "focus" | "insertTimestamp" | "copyMarkdown";
export type AppCommand = "toggleKeyboardHelp";
export type PinCommand = "focusCreate";

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
  return null;
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
