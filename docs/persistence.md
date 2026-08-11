# Persistence

## Principles

koko is local-first. Persistence should be predictable, require no account, and
keep user writing straightforward to back up or migrate.

DailyNotes and Sticky Notes are stored in SQLite. Lightweight application
settings are stored separately in JSON. The app does not write notes as
individual Markdown files, but DailyNote content can be copied as Markdown.

## Storage Locations

- `data.sqlite` is stored in the Tauri application data directory.
- `settings.json` is stored in the Tauri application configuration directory.
- The exact parent directories are resolved by Tauri for the current operating
  system.

The database directory is created when needed. SQLite migrations run during app
startup before commands that use the database are registered.

## DailyNotes

The `daily_notes` table stores:

| Field           | Meaning                                              |
| --------------- | ---------------------------------------------------- |
| `id`            | Internal integer identifier                          |
| `note_date`     | Unique local date in `YYYY-MM-DD` form               |
| `body_html`     | Tiptap-compatible editor HTML                        |
| `created_at_ms` | Creation timestamp in Unix milliseconds              |
| `updated_at_ms` | Last persisted update timestamp in Unix milliseconds |

There can be only one DailyNote for a given date. Creating an existing date
returns the existing note without replacing its body. Previous and next
navigation queries use date order and therefore move only among persisted notes.

DailyNote edits are persisted after a 500 ms debounce. Navigation flushes pending
content before loading another note.

## Sticky Notes

The `sticky_notes` table stores:

| Field            | Meaning                                               |
| ---------------- | ----------------------------------------------------- |
| `id`             | Internal integer identifier                           |
| `body`           | Trimmed, non-empty plain text                         |
| `color`          | `yellow`, `pink`, `blue`, or `green`                  |
| `created_at_ms`  | Creation timestamp in Unix milliseconds               |
| `updated_at_ms`  | Last content, color, pin, or archive update timestamp |
| `pinned_at_ms`   | Pin timestamp, or `NULL` when unpinned                |
| `position`       | Zero-based position within the current pin group      |
| `archived_at_ms` | Archive timestamp, or `NULL` while active             |

Active notes are ordered by pin group, then by `position`. Creation, pinning,
unpinning, archiving, and reordering update group positions transactionally so
that positions remain contiguous. Reordering cannot move a note across pin
groups.

Archiving is a soft delete. Archived rows remain in SQLite but are excluded from
the active-note query.

## Settings

`settings.json` contains these groups:

```json
{
  "dailyNote": {
    "templateMarkdown": ""
  },
  "globalShortcut": {
    "dailyNoteFocus": "CommandOrControl+Shift+L"
  },
  "pomodoro": {
    "focusDurationMinutes": 25,
    "focusVolume": 100,
    "completionVolume": 100
  }
}
```

Missing fields receive defaults. A missing or invalid settings file also falls
back to defaults. Settings are written as formatted JSON to a temporary file and
then renamed over `settings.json` to avoid exposing a partially written file.

Pomodoro duration is constrained to 1–60 minutes. Volume values are constrained
to 0–100.

## Schema Migrations

Migrations are append-only, ordered, and tracked with SQLite `user_version`.
Existing migrations must not be rewritten after release. Schema changes should
add a new numbered migration and include migration tests for existing data.

## Backup and Export Considerations

- A complete local backup should include both `data.sqlite` and `settings.json`.
- DailyNote writing remains export-friendly through the Markdown conversion used
  by the copy action.
- New persistence behavior should avoid surprising files outside the Tauri app
  data and configuration directories.

## Related Specifications

- [Feature Specification](feature-spec.md)
- [Product Specification](product-spec.md)
