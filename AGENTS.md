# AGENTS.md

## Overview

koko is a desktop app for focused work.

It succeeds Current, but changes the core information model. Current separated
`Todo` and `Log`; koko should provide one DailyNote for the day, Sticky Notes for
date-independent notes, and a Pomodoro timer.

This project values:

- plain note-taking
- low friction
- keyboard-first workflow
- local-first SQLite storage
- calm, minimal UI
- explicit user control over DailyNote boundaries
- English-only application UI

Before implementing new features, consider whether the feature strengthens the
DailyNote, Sticky Notes, or Pomodoro rhythm. If it adds classification, workflow
management, analytics, or ceremony, it probably does not belong in the core app.

## Relationship To Current

Use `../current` as the reference implementation for:

- Tauri + Svelte project setup
- frontend tooling
- Rust command and persistence patterns
- Pomodoro state logic
- keyboard shortcut handling
- settings structure
- release and packaging workflow

Do not copy Current's product model blindly. koko should not recreate separate
Todo and Log sections.

## Product Direction

The main screen should be centered on:

- a DailyNote editor
- Sticky Notes
- a compact Pomodoro timer
- minimal app-level controls

Todos should be represented inside the DailyNote, usually as checkboxes. Logs
should be represented inside the DailyNote, optionally with timestamps. The app
should not require the user to choose between Todo mode and Log mode before
writing.

Starting today's note should be a user action. The first implementation should
avoid automatically switching the active DailyNote at midnight.

The application UI should be written in English. Do not introduce locale-specific
UI behavior unless it is explicitly discussed.

Use Tiptap for the DailyNote editor. The editor should support comfortable
Markdown-like writing, but koko should not become a rich document editor.

The initial release target is `v0.1.0`.

## Development Workflow

Please follow `TODO.md`.

Before making large changes:

1. Explain what will be implemented
2. Explain the technical approach
3. Explain important tradeoffs or alternatives
4. Confirm direction when the change affects product behavior

Keep tasks small and incremental.

## Required Checks

When code exists, run checks that match the touched areas before opening or
updating a pull request.

For frontend or shared repository changes:

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run check`
- `pnpm test`
- `pnpm run build`

For Rust changes:

- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `cargo clippy --manifest-path src-tauri/Cargo.toml --locked -- -D warnings`
- `cargo test --manifest-path src-tauri/Cargo.toml --locked`

If the exact scripts differ after project setup, update this section.

## Design Principles

### 1. Keep The DailyNote Primary

The DailyNote editor is the user's working memory.

Avoid UI that pulls ordinary writing into separate forms, categories, tabs, or
databases unless there is a clear reason.

### 2. Keep Sticky Notes Lightweight

Sticky Notes are visible, date-independent notes for goals, reminders, and ideas.

Avoid turning Sticky Notes into a task manager, board, hierarchy, or tagging system.
Sticky Notes should be easy to create, pin, unpin, and archive.

### 3. Preserve Markdown Portability

The DailyNote body should stay portable and understandable as Markdown-like
content.

Prefer behavior that helps Markdown writing, such as list continuation,
checkboxes, timestamp insertion, and predictable keyboard editing.

Avoid hidden structure that makes the document hard to export, migrate, or read
outside the app.

### 4. Keep Pomodoro Supporting

Pomodoro should support rhythm without dominating the workspace.

Avoid productivity scores, rankings, detailed analytics, gamification, and
session-heavy dashboards.

### 5. Be Keyboard-First

Major workflows should work without the mouse.

Keyboard shortcuts, focus management, and text editing behavior are part of the
core experience, not polish.

### 6. Stay Local-First

Initial persistence should be local.

Do not introduce cloud sync, accounts, team collaboration, or remote storage
without explicit product discussion.

Use SQLite for `v0.1.0` persistence.

## Code Style

- Prefer readable, direct code
- Follow existing project patterns once they exist
- Use Current's implementation as a reference, not as a strict template
- Use `DailyNote` for the primary day-bound note model
- Use `StickyNote` for date-independent sticky notes
- Keep components small and focused
- Extract testable logic from UI components when behavior becomes meaningful
- Avoid premature abstraction

## TODO Notes

When implementing tasks from `TODO.md`:

- update task status clearly
- add newly decided product behavior to `TODO.md`
- keep decisions close to the phase where they matter
- stop and discuss if implementation reveals a better product direction
