# Feature Specification

## DailyNote

### Model and lifecycle

- A DailyNote is identified by a local calendar date in `YYYY-MM-DD` form.
- At most one DailyNote exists for each date.
- Launching koko opens or creates the DailyNote for the current local date.
- The active DailyNote does not change automatically when the date changes.
- When today's DailyNote already exists, `Today` saves the active note and moves
  to today's note.
- When today's DailyNote does not exist, `Start today's note` saves the active
  note and creates today's note.
- A DailyNote template is applied only when `Start today's note` creates a new
  note. Changing the template does not alter existing notes.
- An empty template creates a blank DailyNote.

### Navigation

- Previous and next navigation moves between existing DailyNotes in date order.
- Navigation skips dates that do not have a DailyNote.
- Previous and next controls are disabled when no note exists in that direction.
- Moving to another DailyNote saves the active note first.

### Editor

- Tiptap is the editor foundation.
- The editor supports paragraphs, headings, bullet lists, ordered lists, and task
  lists through Markdown-like input.
- `- ` and `1. ` start lists and continue compatible lists on the next line.
- `- [ ] ` and `- [x] ` create unchecked and checked task items.
- Backspace on an empty list item removes that item without leaving an unintended
  gap.
- Removing the blank line between compatible adjacent lists joins the lists
  without flattening nested content.
- Markdown-like plain text pasted without an HTML clipboard representation is
  inserted as formatted content.
- A timestamp command inserts the current local time as `HH:mm` without adding a
  trailing space.
- The current note can be copied to the clipboard as Markdown.

### Saving and feedback

- Editor changes are saved locally after a 500 ms debounce.
- Navigation and Today actions flush pending content before changing notes.
- The header shows a saving indicator while persistence is in progress.
- A saved indicator is shown temporarily after a successful save.
- `Save failed` is shown when persistence fails.
- Copy success and failure are reported temporarily on the copy action.

## Sticky Notes

### Model

- Sticky Notes are independent of calendar dates.
- Active notes are divided into pinned and unpinned groups.
- Pinned notes appear before unpinned notes.
- Each note contains plain text and one of four colors: yellow, pink, blue, or
  green.
- New notes are yellow and are inserted at the top of the unpinned group.

### Creation and editing

- A Sticky Note can be created from the add action or the creation shortcut.
- Leading and trailing whitespace is removed before persistence.
- Empty content is not persisted.
- Clicking a note, or activating it with Enter or Space, opens in-place editing.
- Creation and editing use plain-text textareas with Markdown-like continuation
  for bullet, ordered, and task-list markers.
- Saving or discarding an edit leaves the note collection visible in the same
  scroll context.

### Pinning, ordering, color, and archive

- Pinning or unpinning moves a note to the top of its destination group.
- Reordering is restricted to the current pin group and never changes pin state.
- Notes can be reordered by dragging the dedicated handle.
- When the reorder handle is focused, Arrow Up and Arrow Down move the note
  within its group.
- Color is persisted per note.
- Archiving removes a note from the active collection; the current UI does not
  expose archived notes.
- Sticky Notes do not have a general selected state.

## Pomodoro

### Timer behavior

- The default focus duration is 25 minutes.
- The duration can be configured from 1 to 60 whole minutes.
- The timer has Ready, Focusing, and Paused states.
- Start begins a ready timer; Pause stops a running timer; Continue resumes a
  paused timer.
- Reset returns the timer to its full configured duration and stops focus audio.
- Changing duration resets an idle or paused timer to the new duration.
- Changing duration while the timer is running does not alter that running
  timer.
- Completion returns the timer to Ready at its configured duration.
- Session counts and analytics are not recorded.

### Sound and notifications

- A quiet focus sound loop plays while the timer is running.
- A completion sound plays when the timer reaches zero.
- Focus and completion volume are independently configurable from 0 to 100.
- If notification permission has been granted, completion sends a desktop
  notification.
- When permission has not been granted, the timer panel offers an explicit
  action to request it.

## App Settings

- The settings dialog edits the DailyNote template as Markdown.
- Template changes are persisted only when the user chooses Save.
- Clearing the template prepares an empty value; the user must still save the
  change.
- Pomodoro duration and volume changes are saved after a short debounce.
- The global DailyNote focus shortcut can be changed from the keyboard shortcuts
  dialog.

## Updates

- The desktop app checks for updates at startup.
- Further checks occur when the window regains focus, subject to a 24-hour
  cooldown, and on a 24-hour interval.
- When an update is available, an install action appears in the sidebar.
- Successful installation relaunches the app.
- Update check or installation failures do not replace the workspace with an
  error screen.

## Related Specifications

- [Product Specification](product-spec.md)
- [Keyboard Workflow](keyboard-workflow.md)
- [Persistence](persistence.md)
