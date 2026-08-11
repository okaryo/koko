# Keyboard Workflow

## Purpose

Keyboard support is part of koko's core interaction model. Shortcuts should keep
the user in the writing flow, make focus changes predictable, and avoid
overriding native text editing without a clear benefit.

The shortcut labels below describe the current in-app behavior. `Cmd` refers to
the macOS Command modifier. The configurable global shortcut uses
`CommandOrControl` at the Tauri layer.

## Global Shortcut

| Action          | Default                    | Behavior                                                                                    |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| Focus DailyNote | `CommandOrControl+Shift+L` | Brings koko to the front and focuses the DailyNote editor, even when another app is active. |

The global shortcut can be changed from the keyboard shortcuts dialog. A custom
shortcut must include Command, Control, or Option together with a letter,
number, supported punctuation key, or function key. koko rejects shortcuts that
conflict with its fixed in-app shortcuts or cannot be registered by the system.

## DailyNote

| Action           | Shortcut      | Behavior                                                                |
| ---------------- | ------------- | ----------------------------------------------------------------------- |
| Focus editor     | `Cmd+Shift+N` | Focuses the active DailyNote editor without changing its content.       |
| Copy note        | `Cmd+Shift+C` | Copies the active DailyNote as Markdown.                                |
| Previous note    | `Cmd+Shift+[` | Saves the active note and opens the nearest earlier existing DailyNote. |
| Next note        | `Cmd+Shift+]` | Saves the active note and opens the nearest later existing DailyNote.   |
| Insert timestamp | `Ctrl+T`      | Inserts the current local time as `HH:mm` at the editor cursor.         |
| Toggle checkbox  | `Cmd+Enter`   | Toggles the task item containing the editor cursor.                     |

Previous and next commands do nothing when there is no note in the requested
direction. Timestamp insertion and Markdown copy do not run when focus is in a
Sticky Note textarea or another editable control outside the DailyNote.

## Pomodoro

| Action                    | Shortcut      | Behavior                                                                                  |
| ------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| Start, pause, or continue | `Cmd+Shift+P` | Toggles the timer between running and stopped states while preserving the remaining time. |
| Reset                     | `Cmd+Shift+R` | Stops the timer and restores its configured duration.                                     |

Pomodoro shortcuts do not intentionally move focus away from the current writing
surface.

## Sticky Notes

| Action                   | Shortcut                   | Behavior                                                                     |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------------- |
| Create Sticky Note       | `Cmd+Shift+I`              | Opens the composer and focuses its textarea.                                 |
| Save composer or edit    | `Cmd+Enter`                | Persists non-empty content and closes the active composer or editor.         |
| Discard composer or edit | `Esc`                      | Closes the active composer or editor without persisting its current changes. |
| Open a note for editing  | `Enter` or `Space`         | Opens the focused Sticky Note in-place.                                      |
| Reorder a note           | `Arrow Up` or `Arrow Down` | Moves a note when its dedicated reorder handle is focused.                   |

Plain Enter in a Sticky Note textarea continues supported Markdown-like list
markers. koko does not assign single-letter list-navigation commands, so normal
typing remains available.

## App and Dialogs

| Action                    | Shortcut | Behavior                                                                                 |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| Toggle keyboard shortcuts | `Cmd+/`  | Opens or closes the keyboard shortcuts dialog.                                           |
| Close dialog              | `Esc`    | Closes the active dialog. While recording a global shortcut, it cancels recording first. |

The keyboard icon in the lower-right app controls opens the shortcuts dialog for
users who do not know `Cmd+/`.

An open dialog takes precedence over DailyNote editor commands. DailyNote focus,
copy, timestamp, and checkbox commands must not modify content behind a modal
dialog.

## Editor Keyboard Behavior

- Bullet, ordered, and task lists continue on Enter.
- Backspace on an empty list item exits or removes that item without leaving an
  unintended blank list item.
- Deleting the boundary between compatible lists joins them while preserving
  nested list content.
- Native text selection, cursor movement, clipboard behavior, and text input
  should remain unchanged unless a documented koko command applies.

## Related Specifications

- [Feature Specification](feature-spec.md)
- [Product Specification](product-spec.md)
