# Data Model

All shapes are defined once, in `app/src/services/validation/schemas.ts`,
as Zod schemas. TypeScript types are derived via `z.infer<typeof X>` —
this file describes them at a high level; the schema file is the actual
source of truth.

## Entities

| Entity | File(s) | Notes |
|---|---|---|
| `DailyLog` | `data/daily/YYYY-MM-DD.json` | One file per day. Central input. |
| `Habit` | `data/habits/habits.json` | All habits in one file (small, low churn). |
| `Goal` | `data/goals/goals.json` | Same. |
| `Project` / `Task` | `data/projects/projects.json` | Tasks reference `projectId`; projects hold `taskIds`. Kept in one file since they're edited together. |
| `Transaction` | `data/finance/transactions/YYYY-MM.json` | Chunked by month. |
| `TrainingSession` / weight | `data/health/training.json` | |
| `Book` | `data/knowledge/books/books.json` | Excalidraw files themselves stay external; this is metadata only. |
| `Review` | `data/reviews/{weekly,monthly}/PERIOD.json` | `PERIOD` is `YYYY-Www` or `YYYY-MM`. |
| `Settings` | `data/settings/settings.json` | App-level config, not personal data per se. |

## Cross-references

Entities reference each other by string `id`, never by embedding a full
copy of another entity. E.g. a `Task.projectId` points at a `Project.id`;
`DailyLog.tasks` holds lightweight `{id, title, done}` refs, not full task
objects. This keeps files independently editable and prevents the same
fact (e.g. a task's title) from drifting out of sync across two files.

## Adding a new field

1. Add it to the relevant Zod schema in `schemas.ts` — mark it `.optional()`
   unless every existing file already has it (Zod will otherwise reject
   old files on read).
2. If it needs a sensible default for old records, use `.default(...)`
   instead of `.optional()`.
3. Types update automatically (`z.infer`) — no separate interface to edit.

## Adding a new module (e.g. "Mood journal")

1. Decide on a file granularity (one file total? one per month? per day?)
   based on expected write frequency and size — follow the existing
   patterns above.
2. Add a Zod schema for the entity and its file wrapper.
3. Add the CRUD methods to the `DataStore` interface and implement them in
   `JsonDataStore`, following the existing methods as a template (read →
   validate → mutate in memory → `writeJsonSafe`).
4. Add a page under `app/src/pages/` and a nav entry in `Sidebar.tsx`.
