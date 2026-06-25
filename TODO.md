# TODO

## Phase 0 - Product Direction

- [x] Read Current's README, AGENTS, TODO, and main app structure
- [x] Define koko as Current's successor
- [x] Capture the main product change: one DailyNote workspace instead of separate Todo and Log sections
- [x] Capture Pomodoro as a supporting feature
- [x] Decide the primary model name: DailyNote
- [x] Decide the initial DailyNote lifecycle
- [x] Decide the initial storage format: SQLite
- [x] Decide to include Pins in v0.1.0
- [x] Decide to use Tiptap for the editor
- [ ] Decide whether the first version should import or ignore Current data
- [ ] Decide whether the first version should include a Quick Entry window

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
- DailyNote and Pin data should be persisted in SQLite for `v0.1.0`.
- Pins are date-independent notes that stay visible in the window.
- Pins should be creatable and archivable in `v0.1.0`.
- The DailyNote editor should use Tiptap.
- Pomodoro exists to support rhythm, not to drive analytics or scoring.
- Pomodoro behavior, sound volume settings, sound source settings, and keyboard shortcuts should follow Current where practical.
- Current is the implementation reference, but its separate Todo and Log sections should not be carried over.

Open product questions:

- What UI should appear after the date crosses while an older DailyNote is still active?
- When the user starts today's note, should koko create a blank note, copy a template, or insert a default heading?
- Should koko show previous DailyNotes in-app in `v0.1.0`, or only focus on the active DailyNote?
- Should Pomodoro completion insert a timestamp or prompt in the DailyNote?
- Should Quick Entry exist in the first release, and if so, should it append content to the active DailyNote?

---

## Phase 1 - Project Setup

- [x] Create Tauri + Svelte project
- [x] Setup TypeScript
- [x] Setup SvelteKit static adapter
- [x] Add Tiptap dependencies
- [ ] Setup linting and formatting
- [ ] Setup Vitest
- [x] Setup Rust crate structure
- [x] Setup Tauri capabilities
- [x] Setup basic window configuration
- [x] Decide package manager and pin version
- [ ] Add CI checks

Setup decisions:

- Use Current's setup as the starting reference.
- Keep the initial app surface smaller than Current: DailyNote editor, Pins, and Pomodoro.

---

## Phase 2 - DailyNote Workspace

- [x] Create DailyNote model
- [x] Create main Tiptap editor UI
- [x] Persist the active DailyNote locally
- [x] Load the active DailyNote on launch
- [ ] Add explicit "Start today's note" action
- [ ] Add unsaved/error state handling if needed
- [ ] Add keyboard-first editor focus behavior
- [ ] Add list continuation behavior
- [ ] Add checkbox continuation behavior
- [ ] Add timestamp insertion command

Daily workspace decisions:

- The editor is the primary surface.
- The app should not require separate Todo and Log entry modes.
- Tiptap is the editor foundation.
- DailyNote content should remain portable as Markdown-like content.
- Avoid hidden metadata inside the document unless it is necessary and discussed.

---

## Phase 3 - Pins

- [ ] Create Pin model
- [x] Persist Pins in SQLite
- [ ] Create visible Pins UI
- [x] Create Pin
- [ ] Edit Pin
- [x] Archive Pin
- [ ] Add keyboard-first Pin navigation
- [ ] Add keyboard shortcut for creating a Pin
- [ ] Add keyboard shortcut for archiving a Pin

Pin decisions:

- Pins are included in `v0.1.0`.
- Pins are date-independent.
- Pins should stay visible in the window.
- Pins are for month-level goals, reminders, and small ideas.
- Pins should not become a task database, board, hierarchy, or tagging system.

---

## Phase 4 - Pomodoro Timer

- [x] Port or reimplement Pomodoro state logic from Current
- [x] Create compact Pomodoro UI
- [x] Start timer
- [x] Pause timer
- [x] Reset timer
- [x] Display remaining time
- [x] Add keyboard shortcuts
- [ ] Add completion notification
- [ ] Add focus and completion sounds
- [ ] Add Pomodoro sound volume settings
- [ ] Add Pomodoro sound source settings
- [ ] Persist timer settings

Pomodoro decisions:

- Pomodoro behavior should follow Current where practical.
- Focus duration should default to 25 minutes.
- Timer controls should be available without pulling focus away from the editor.
- Session counts and analytics are not planned for the core app.

---

## Phase 5 - Keyboard Workflow

- [x] Define app-wide shortcuts
- [ ] Define editor shortcuts
- [x] Define Pomodoro shortcuts
- [ ] Define Pin shortcuts
- [ ] Add keyboard shortcut help
- [ ] Ensure focus behavior is predictable
- [ ] Preserve native text editing behavior where possible

Keyboard decisions:

- Keyboard support is core behavior.
- Shortcut design should prioritize writing flow over app navigation.
- Current's keyboard handling is a useful reference, but koko has fewer sections.
- All major DailyNote, Pin, and Pomodoro operations must be keyboard-accessible.
- `Cmd+Shift+P`: start, pause, or continue Pomodoro.
- `Cmd+Shift+R`: reset Pomodoro.

---

## Phase 6 - Persistence

- [x] Choose local persistence approach: SQLite
- [x] Implement DailyNote repository
- [x] Implement Pin repository
- [ ] Implement settings repository
- [x] Add SQLite migrations
- [ ] Add backup/export-friendly data shape

Persistence decisions:

- Use SQLite for `v0.1.0`.
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

- [ ] Add tests for Markdown editing helpers
- [ ] Add tests for DailyNote lifecycle logic
- [x] Add tests for Pin behavior
- [ ] Add tests for Pomodoro state transitions
- [x] Add Rust tests for persistence logic
- [ ] Add a small manual keyboard workflow checklist

Testing decisions:

- Extract behavior-heavy logic from Svelte components.
- Keep UI automation minimal until the interaction model stabilizes.

---

## Phase 8 - UI Polish

- [ ] Design main app layout
- [ ] Tune typography for long writing sessions
- [ ] Tune editor and timer contrast
- [ ] Add clear empty state
- [ ] Add calm error states
- [ ] Verify small desktop window behavior
- [ ] Verify keyboard-only workflow manually

UI decisions:

- The app should feel calm and quiet.
- The DailyNote should visually dominate the screen.
- Pins should be visible but should not compete with the DailyNote.
- The Pomodoro timer should remain compact and supportive.

---

## Later

- [ ] DailyNote templates
- [ ] Browse previous DailyNotes
- [ ] Search DailyNotes
- [ ] Current data import
- [ ] Export DailyNotes
- [ ] System tray or menu bar timer
- [ ] Release workflow
- [ ] App icon

Later decisions:

- Do not add these until the core writing and Pomodoro loop feels right.
