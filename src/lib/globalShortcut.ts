export type ShortcutKeydownEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

type ShortcutCaptureResult =
  | { status: "pending" }
  | { status: "captured"; shortcut: string }
  | { status: "invalid"; message: string };

const modifierKeys = new Set(["Meta", "Control", "Alt", "Shift"]);
const conflictingShortcuts = new Set([
  "CommandOrControl+Shift+N",
  "CommandOrControl+Shift+C",
  "CommandOrControl+Shift+P",
  "CommandOrControl+Shift+R",
  "CommandOrControl+Shift+I",
]);

export function shortcutFromKeydown(
  event: ShortcutKeydownEvent,
): ShortcutCaptureResult {
  if (modifierKeys.has(event.key)) {
    return { status: "pending" };
  }

  const key = normalizedShortcutKey(event);

  if (!key) {
    return {
      status: "invalid",
      message: "Use a letter, number, or function key.",
    };
  }

  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    return {
      status: "invalid",
      message: "Use Command, Control, or Option with another key.",
    };
  }

  const shortcut = [...modifierParts(event), key].join("+");

  if (conflictingShortcuts.has(shortcut)) {
    return {
      status: "invalid",
      message: "That shortcut is already used by koko.",
    };
  }

  return { status: "captured", shortcut };
}

export function shortcutToDisplayKeys(shortcut: string) {
  return shortcut.split("+").map((part) => {
    switch (part) {
      case "CommandOrControl":
      case "Command":
      case "Super":
        return "Cmd";
      case "Control":
        return "Ctrl";
      case "Alt":
      case "Option":
        return "Option";
      case "Shift":
        return "Shift";
      case "Comma":
        return ",";
      case "Space":
        return "Space";
      default:
        return part;
    }
  });
}

function modifierParts(event: ShortcutKeydownEvent) {
  const parts: string[] = [];

  if (event.metaKey) {
    parts.push("CommandOrControl");
  }

  if (event.ctrlKey) {
    parts.push("Control");
  }

  if (event.altKey) {
    parts.push("Alt");
  }

  if (event.shiftKey) {
    parts.push("Shift");
  }

  return parts;
}

function normalizedShortcutKey(event: ShortcutKeydownEvent) {
  if (/^[a-z]$/i.test(event.key)) {
    return event.key.toUpperCase();
  }

  if (/^\d$/.test(event.key)) {
    return event.key;
  }

  if (/^F([1-9]|1\d|2[0-4])$/i.test(event.key)) {
    return event.key.toUpperCase();
  }

  switch (event.key) {
    case ",":
      return "Comma";
    case " ":
      return "Space";
    default:
      return null;
  }
}
