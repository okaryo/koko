# koko

koko is a simple desktop app for staying with the work in front of you.

It is the successor to [Current](https://github.com/okaryo/current). Current
separated `Todo` and `Log` into different surfaces. koko intentionally removes
that split: the main workspace is a DailyNote for the day, supported by Sticky
Notes and a Pomodoro timer.

## Philosophy

koko is designed to help you:

- keep a lightweight daily working note
- write intentions, tasks, notes, and outcomes in one place
- return to the current thread of work after interruptions
- keep a steady working rhythm with a Pomodoro timer

koko should feel like a quiet desk: one note for today, a few sticky notes, one
timer, and as little app-shaped ceremony as possible.

## Main Features

- DailyNote workspace
- Sticky Notes for date-independent notes
- Pomodoro timer
- Keyboard-first workflow
- Local-first SQLite storage

## Documentation

- [Product specification](docs/product-spec.md)
- [Feature specification](docs/feature-spec.md)
- [Keyboard workflow](docs/keyboard-workflow.md)
- [Persistence](docs/persistence.md)
- [Release](docs/release.md)

## Installation

koko is distributed for macOS, Windows, and Linux.

### Manual Installation

1. Open the [latest release on GitHub](https://github.com/okaryo/koko/releases/latest).
2. Download the installer for your OS:
   - macOS Apple Silicon: the file ending in `_aarch64.dmg`
   - macOS Intel: the file ending in `_x64.dmg`
   - Windows: the `.exe` or `.msi` installer
   - Linux: the `.deb` package or `.AppImage`
3. Install or run koko:
   - macOS: open the downloaded DMG and move koko to your Applications folder.
   - Windows: run the downloaded installer.
   - Linux `.deb`: install it with your package manager.
   - Linux `.AppImage`: make it executable, then run it.
4. Start koko from your applications menu or launcher.

koko is not notarized with Apple Developer ID. If macOS says koko is damaged and
can't be opened, run the following command after moving koko to Applications:

```sh
xattr -cr /Applications/koko.app
```

Then open koko again. This removes the quarantine attributes that macOS applies to
downloaded apps.

Windows installers are not code-signed yet, so Windows may show a SmartScreen warning.

The `app.tar.gz`, `.sig`, and `latest.json` assets are used by the in-app updater and are
not needed for manual installation.

Homebrew tap installation is not available yet.

## DailyNote Workspace

The DailyNote is the primary surface of the app.

Users should be able to write todos, logs, decisions, links, notes, and rough
thinking together without choosing a mode. A todo can simply be a checkbox. A
log can simply be a timestamped paragraph or bullet. koko should not force users
to classify entries before writing them.

The app should keep the active DailyNote stable when the date changes. If a new
day starts while an older note is active, switching to today's note should be an
explicit user action.

The editor should be powered by Tiptap. The goal is not a rich document editor;
it is a comfortable Markdown-like writing surface with predictable keyboard
behavior.

## Sticky Notes

Sticky Notes are date-independent notes that remain visible in the window.

They are for month-level goals, reminders, and small ideas that should stay in
sight while the DailyNote changes over time. Sticky Notes can be created and
pinned, unpinned, and archived, but they should not become a task database or
project board.

## Pomodoro

The Pomodoro timer is a supporting surface.

It should help maintain rhythm, but it should not become the center of the app.
Session counts, analytics, and productivity scoring are intentionally outside
the core direction for now.

## What koko Is NOT

koko is not:

- a project management system
- a team collaboration tool
- a knowledge management app
- a task database
- an analytics dashboard
- a productivity scoring tool

koko focuses on writing and rhythm, not optimization.
