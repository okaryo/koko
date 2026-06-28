# TODO

## Phase 0 - Product Direction

- [x] Read Current's README, AGENTS, TODO, and main app structure
- [x] Define koko as Current's successor
- [x] Capture the main product change: one DailyNote workspace instead of separate Todo and Log sections
- [x] Capture Pomodoro as a supporting feature
- [x] Decide the primary model name: DailyNote
- [x] Decide the initial DailyNote lifecycle
- [x] Decide the initial storage format: SQLite
- [x] Decide to include Sticky Notes in v0.1.0
- [x] Decide to use Tiptap for the editor
- [x] Decide not to import Current data in v0.1.0
- [x] Decide not to include a Quick Entry window in v0.1.0

Direction decisions:

- koko should use Tauri + Svelte, following Current's base stack.
- The initial release target is `v0.1.0`.
- The primary day-bound model is `DailyNote`.
- Application UI should be written in English.
- The main workspace is the DailyNote for the current day.
- Todos and logs should be written together in the DailyNote.
- Checkboxes are the likely first representation for todos.
- Starting today's note should be triggered by a user action.
- The app should not automatically switch notes when the date changes.
- DailyNote and StickyNote data should be persisted in SQLite for `v0.1.0`.
- Sticky Notes are date-independent notes that stay visible in the window.
- Sticky Notes should be creatable and archivable in `v0.1.0`.
- The DailyNote editor should use Tiptap.
- Pomodoro exists to support rhythm, not to drive analytics or scoring.
- Pomodoro behavior, sound volume settings, and keyboard shortcuts should follow Current where practical.
- Current is the implementation reference, but its separate Todo and Log sections should not be carried over.
- koko should not import Current data in `v0.1.0`.
- koko should not include a Quick Entry window in `v0.1.0`.

Open product questions:

- What UI should appear after the date crosses while an older DailyNote is still active?
- When the user starts today's note, should koko create a blank note, copy a template, or insert a default heading?
- Should koko show previous DailyNotes in-app in `v0.1.0`, or only focus on the active DailyNote?
- Should Pomodoro completion insert a timestamp or prompt in the DailyNote?

---

## Phase 1 - Project Setup

- [x] Create Tauri + Svelte project
- [x] Setup TypeScript
- [x] Setup SvelteKit static adapter
- [x] Add Tiptap dependencies
- [x] Setup linting and formatting
- [x] Setup Vitest
- [x] Setup Rust crate structure
- [x] Setup Tauri capabilities
- [x] Setup basic window configuration
- [x] Decide package manager and package manager version
- [x] Add CI checks

Setup decisions:

- Use Current's setup as the starting reference.
- Keep the initial app surface smaller than Current: DailyNote editor, Sticky Notes, and Pomodoro.

---

## Phase 2 - DailyNote Workspace

- [x] Create DailyNote model
- [x] Create main Tiptap editor UI
- [x] Persist the active DailyNote locally
- [x] Load the active DailyNote on launch
- [x] Add explicit Today action
- [x] Add previous and next DailyNote navigation
- [x] Add quick return to today's DailyNote
- [x] Add unsaved/error state handling if needed
- [x] Add keyboard-first editor focus behavior
- [x] Add list continuation behavior
- [x] Add checkbox continuation behavior
- [x] Add timestamp insertion command

Daily workspace decisions:

- The editor is the primary surface.
- The app should not require separate Todo and Log entry modes.
- Tiptap is the editor foundation.
- DailyNote content should remain portable as Markdown-like content.
- Avoid hidden metadata inside the document unless it is necessary and discussed.
- Previous and next navigation moves between existing DailyNotes.
- Previous and next navigation buttons are disabled when no adjacent DailyNote exists.
- `Today` appears when today's DailyNote exists and moves to it after saving the current DailyNote.
- `Today` is disabled while today's DailyNote is active.
- `Start today's note` appears when today's DailyNote does not exist and creates it after saving the current DailyNote.
- `Cmd+Shift+N`: focus the DailyNote editor.
- `Ctrl+T`: insert `HH:mm` at the current DailyNote cursor position.
- `Cmd+Enter`: toggle the current DailyNote checkbox item.
- Tiptap handles normal list continuation for `- ` and `1. ` input.
- `- [ ] ` and `- [x] ` create checkbox items in the DailyNote editor.
- Pasted Markdown-like plain text is inserted as formatted DailyNote content.
- The DailyNote header shows an animated saving icon, a temporary saved icon, or `Save failed` for local persistence state.

---

## Phase 3 - Sticky Notes

- [x] Create StickyNote model
- [x] Persist Sticky Notes in SQLite
- [x] Create visible Sticky Notes UI
- [x] Create StickyNote
- [x] Edit StickyNote
- [x] Archive StickyNote
- [x] Pin StickyNote
- [x] Unpin StickyNote
- [x] Add keyboard shortcut for creating a StickyNote
- [x] Keep existing StickyNote management mouse-first

StickyNote decisions:

- Sticky Notes are included in `v0.1.0`.
- Sticky Notes are date-independent.
- Sticky Notes should stay visible in the window.
- Sticky Notes are for month-level goals, reminders, and small ideas.
- Sticky Notes should not become a task database, board, hierarchy, or tagging system.
- `Cmd+Shift+I`: focus the new sticky note input.
- `Cmd+Enter`: save a sticky note composer or edit.
- `Esc`: discard a sticky note composer or edit.
- Existing Sticky Notes are edited by clicking the sticky note.
- Existing Sticky Notes are pinned or unpinned by using the hover action.
- Existing Sticky Notes are archived by using the hover action.
- Sticky Notes do not have a selected state in `v0.1.0`.
- Sticky Notes use `pinnedAtMs` to represent pin state and pinned ordering.
- Pinned Sticky Notes are shown before unpinned Sticky Notes, newest pinned first.

---

## Phase 4 - Pomodoro Timer

- [x] Port or reimplement Pomodoro state logic from Current
- [x] Create compact Pomodoro UI
- [x] Start timer
- [x] Pause timer
- [x] Reset timer
- [x] Display remaining time
- [x] Add keyboard shortcuts
- [x] Add completion notification
- [x] Add focus and completion sounds
- [x] Add Pomodoro duration settings
- [x] Add Pomodoro sound volume settings
- [x] Persist Pomodoro duration settings
- [x] Persist Pomodoro sound volume settings

Pomodoro decisions:

- Pomodoro behavior should follow Current where practical.
- Focus duration should default to 25 minutes.
- Timer controls should be available without pulling focus away from the editor.
- Session counts and analytics are not planned for the core app.
- Pomodoro completion sends a notification when notification permission has been granted.
- Pomodoro plays a quiet focus tick/tock loop while running and a completion sound when the timer completes.
- Pomodoro focus duration can be adjusted from 1 to 60 minutes.
- Pomodoro focus duration changes are applied to idle timers, not to an already running timer.
- Pomodoro focus and completion sound volume can be adjusted from the timer panel.
- Pomodoro focus and completion sound volume settings are persisted locally in `settings.json`.
- Pomodoro focus duration is persisted locally in `settings.json`.

---

## Phase 5 - Keyboard Workflow

- [x] Define app-wide shortcuts
- [x] Define editor shortcuts
- [x] Define Pomodoro shortcuts
- [x] Define StickyNote shortcuts
- [x] Add keyboard shortcut help
- [x] Ensure focus behavior is predictable
- [x] Preserve native text editing behavior where possible
- [x] Add global shortcut for focusing the DailyNote editor
- [x] Make the DailyNote global shortcut configurable

Keyboard decisions:

- Keyboard support is core behavior.
- Shortcut design should prioritize writing flow over app navigation.
- Current's keyboard handling is a useful reference, but koko has fewer sections.
- All major DailyNote, StickyNote, and Pomodoro operations must be keyboard-accessible.
- DailyNote timestamp insertion does not run while focus is in another text input.
- Open dialogs block DailyNote editor shortcuts so commands do not affect the editor behind the dialog.
- `CommandOrControl+Shift+L`: bring koko to the front and focus the DailyNote editor from outside the app.
- The global DailyNote focus shortcut uses Current's default key and can be changed from the keyboard shortcuts dialog.
- A small keyboard icon in the lower-right corner opens the keyboard shortcuts dialog for users who do not know `Cmd+/`.
- `Cmd+Shift+P`: start, pause, or continue Pomodoro.
- `Cmd+Shift+R`: reset Pomodoro.
- `Cmd+/`: open or close keyboard shortcut help.

---

## Phase 6 - Persistence

- [x] Choose local persistence approach: SQLite
- [x] Implement DailyNote repository
- [x] Implement StickyNote repository
- [x] Implement settings file storage
- [x] Add SQLite migrations

Persistence decisions:

- Use SQLite for DailyNote and StickyNote persistence in `v0.1.0`.
- Use `settings.json` in the app config directory for lightweight app settings.
- Follow Current's persistence patterns where practical.
- Keep DailyNote content export-friendly even though storage is SQLite.

Decision criteria:

- Markdown portability
- Tauri implementation complexity
- Backup friendliness
- Future import/export behavior
- Avoiding surprising filesystem writes

---

## Phase 7 - Testing

- [x] Add tests for Markdown editing helpers
- [x] Add tests for DailyNote lifecycle logic
- [x] Add tests for StickyNote behavior
- [x] Add tests for Pomodoro state transitions
- [x] Add Rust tests for persistence logic
- [x] Add a small manual keyboard workflow checklist

Testing decisions:

- Extract behavior-heavy logic from Svelte components.
- Keep UI automation minimal until the interaction model stabilizes.

---

## Phase 8 - UI Polish

- [x] Design main app layout
- [x] Tune typography for long writing sessions
- [x] Tune editor and timer contrast
- [x] Add clear empty state
- [x] Add calm error states
- [x] Add copy action for the current DailyNote content
- [x] Verify small desktop window behavior
- [x] Verify keyboard-only workflow manually

UI decisions:

- The app should feel calm and quiet.
- The DailyNote should visually dominate the screen.
- Sticky Notes should be visible but should not compete with the DailyNote.
- The Pomodoro timer should remain compact and supportive.

---

## Later

- [ ] DailyNote templates
- [ ] DailyNote history picker
- [ ] Search DailyNotes
- [ ] Release workflow
- [ ] App icon

Later decisions:

- Do not add these until the core writing and Pomodoro loop feels right.
