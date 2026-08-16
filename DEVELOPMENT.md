# Development

## Running locally

```bash
cd app
npm install
npm run tauri dev
```

## Project layout

```
app/
├── src/
│   ├── components/     # shared UI (Sidebar, Card, etc.)
│   ├── pages/           # one file per nav item
│   ├── services/
│   │   ├── datastore/   # DataStore interface + JsonDataStore + React context
│   │   ├── analytics/   # pure functions: raw logs in, derived metrics out
│   │   └── validation/  # Zod schemas — source of truth for types
│   ├── hooks/
│   └── types/
└── src-tauri/            # Rust shell, fs/dialog plugin registration, capability scope
```

## When to reach for SQLite instead of JSON

Don't, until one of these is actually true and measured, not guessed:

- Global search across years of daily logs is noticeably slow *after* an
  in-memory index has been tried (see Section 19 / future `search`
  service) — a naive full-rescan-per-query implementation doesn't count
  as "JSON failed," it counts as "the index wasn't built yet."
- Analytics recomputation genuinely can't be solved by the `.cache/`
  layer (Section 16/25) — i.e. even cached, derived-on-demand computation
  is too slow for the dashboard to feel instant.

If either happens, implement `SqliteDataStore` against the existing
`DataStore` interface (`app/src/services/datastore/DataStore.ts`) and swap
it in at `app/src/services/datastore/context.tsx`. Nothing else in the
app should need to change — that's the point of the interface boundary.

## Backups

`DataStore.createBackup()` writes a full JSON snapshot to `exports/`,
timestamped. This is separate from Git — Git tracks live `data/` files
directly (per your choice, commits are manual); `exports/` backups are a
belt-and-suspenders safety net independent of remembering to commit.

## Tests

Deferred per your instruction until after the core data model and
calculation logic (analytics, streaks, correlations) stabilize — expected
around Phase 4–5. When added, prioritize:
- Habit streak/consistency calculations
- Analytics/correlation functions
- Zod schema edge cases (missing fields, old-format files)
