# Product Specification

## Purpose

koko is a desktop app for staying with the work in front of you. It provides a
quiet, local workspace for writing and maintaining a steady work rhythm without
introducing project-management ceremony.

koko succeeds Current, but it intentionally uses a different information model.
Current separated Todo and Log into different surfaces; koko combines intentions,
tasks, notes, decisions, and outcomes in one DailyNote.

## Core Workspace

The main window contains three surfaces:

1. A DailyNote editor as the primary workspace
2. Sticky Notes for date-independent information that should remain visible
3. A compact Pomodoro timer that supports the writing rhythm

The DailyNote must remain visually dominant. Sticky Notes and Pomodoro should be
available without competing with it.

## Product Principles

### Keep the DailyNote primary

Users should be able to write todos, logs, decisions, links, and rough thinking
together without choosing a mode. Todos are normally represented as checkboxes;
logs may be ordinary text, bullets, or timestamped entries.

The app should not pull ordinary writing into separate forms, categories, tabs,
or databases.

### Keep Sticky Notes lightweight

Sticky Notes are for goals, reminders, and small ideas that should remain visible
across DailyNotes. They are not a task board, hierarchy, tagging system, or
project database.

### Keep Pomodoro supporting

Pomodoro exists to support focus rhythm. It should not become the center of the
workspace and should not introduce session dashboards, productivity scores,
rankings, or gamification.

### Preserve user control over day boundaries

The active DailyNote remains stable when the calendar date changes. Starting or
returning to today's note is an explicit user action; the app does not
automatically replace the active note at midnight.

### Be keyboard-first

Writing, DailyNote navigation, Sticky Note creation, and Pomodoro controls should
be available from the keyboard. Focus changes must be predictable and native
text-editing behavior should be preserved where possible.

### Stay local-first

DailyNotes, Sticky Notes, and settings are stored locally. Accounts, cloud sync,
team collaboration, and remote storage are outside the current product model.

### Preserve portable writing

The editor provides comfortable Markdown-like behavior and can copy a DailyNote
as Markdown. koko is not intended to become a general-purpose rich document
editor.

## User Interface

- Application UI text is written in English.
- The visual style should remain calm, compact, and suitable for long writing
  sessions.
- The app window itself does not scroll. Long DailyNote content and large Sticky
  Note collections scroll within their own surfaces.
- App-level controls should remain minimal and should not distract from writing.

## Product Boundaries

koko is not:

- a project management system
- a team collaboration tool
- a knowledge management system
- a task database
- an analytics dashboard
- a productivity scoring tool

New functionality should strengthen the DailyNote, Sticky Notes, or Pomodoro
rhythm. Features that add classification, workflow management, analytics, or
ceremony require explicit product discussion.

## Related Specifications

- [Feature Specification](feature-spec.md)
- [Keyboard Workflow](keyboard-workflow.md)
- [Persistence](persistence.md)
- [Release](release.md)
