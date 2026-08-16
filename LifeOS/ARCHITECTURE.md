# Architecture

## Stack

- **Electron** + **React 18** + **TypeScript** — chosen (over Tauri) so
  the only prerequisite to run or build LifeOS is Node.js. No Rust
  toolchain, no C++ build tools, no per-OS native compiler setup. The
  tradeoff is a larger binary and a security model that has to be set up
  explicitly rather than coming from the framework by default (see
  Security below for how that's handled).
- **Zod** schemas (`app/src/services/validation/schemas.ts`) are the single
  source of truth for both runtime validation and TypeScript types
  (`z.infer`). Never hand-maintain a duplicate interface.
- **Recharts** for charts, **Tailwind** for styling, **React Router**
  (`HashRouter`, needed for loading via `file://` in packaged builds) for
  navigation.

## Persistence

The app never touches the filesystem directly from UI components. Instead:

```
UI components
   ↓
useDataStore() hook
   ↓
DataStore interface (app/src/services/datastore/DataStore.ts)
   ↓
JsonDataStore implementation (app/src/services/datastore/JsonDataStore.ts)
   ↓
window.lifeos (exposed by electron/preload.js via contextBridge)
   ↓
IPC → electron/main.js (the only place that touches Node's `fs`)
```

If JSON files + full-file reads ever become a genuine performance problem
(see `DEVELOPMENT.md` for what "genuine" means), a `SqliteDataStore` can
implement the same `DataStore` interface and get swapped in at
`app/src/services/datastore/context.tsx` — nothing above that layer
changes.

### Data location

`electron/main.js` resolves `data/` and `exports/` relative to the repo
root (in dev) or next to the packaged executable (in a built app) — not
to an OS-managed app-data folder. That means the whole `LifeOS/` folder,
code and data together, can be copied to another machine and keep
working, matching the "copy folder → move → continue using it" goal from
the spec directly, with no extra setup step required.

### Atomic writes

Every write goes: serialize → write `.tmp` → read `.tmp` back and confirm
it parses → write real file → delete `.tmp`. A crash mid-write leaves a
stray `.tmp` file, never a corrupted real file.

### Git-friendliness

- One file per day (`data/daily/YYYY-MM-DD.json`), per month of
  transactions, per week/month of reviews — never one giant file.
- `JSON.stringify(data, null, 2) + "\n"` everywhere, for stable, readable
  diffs.
- `.cache/` (search index, derived analytics) is gitignored — it's
  rebuildable from source data and must never be treated as authoritative.

## Analytics

Per spec Section 16: derived numbers (weekly/monthly aggregates,
correlations) are computed from raw daily logs on read, not stored
permanently, to avoid two sources of truth drifting apart. A cache layer
under `.cache/` may memoize expensive computations, keyed by a hash of
the underlying data + date range, invalidated when source files change.
This is implemented starting Phase 6.

## Security

- The renderer (React app / browser window) has **no direct access to
  Node or the filesystem**: `contextIsolation: true`, `nodeIntegration:
  false`, and `sandbox: true` are all set on the `BrowserWindow` in
  `electron/main.js`. The only bridge is `window.lifeos`, a narrow set of
  functions exposed by `electron/preload.js` via `contextBridge`.
- Every one of those functions is handled in the main process
  (`electron/main.js`), which resolves the requested path and verifies
  it's still inside the allowed `data/` or `exports/` folder before
  touching disk (`resolveScoped()`), rejecting any path-traversal attempt.
- No network permissions are requested anywhere in the app. No telemetry.
- Import (`DataStore.importAll`) validates every entity against its Zod
  schema *before* writing anything, so a malformed import file can't
  partially corrupt existing data.
