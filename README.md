# LifeOS

A local-first personal operating system. Your data lives in plain JSON
files on your own machine, in this folder, versioned with your own Git
repo if you choose to.

## Quickstart

Prerequisites (one-time):
- [Node.js](https://nodejs.org) 18+ — that's it, no other toolchain needed.

Then:

```bash
cd app
npm install
npm run dev
```

That opens LifeOS as a real desktop window (Electron). First run will seed
default settings automatically.

To build a distributable installer:

```bash
npm run dist
```

## Where your data lives

See `ARCHITECTURE.md` — short version: `data/` in this repo root, one
JSON file per day/month/entity, safe atomic writes, nothing leaves your
machine.

## Status

This is **Phase 2** of the build plan (see the original spec): app shell,
navigation, theme, JSON persistence layer, validation, and a Dashboard
skeleton are in place. Today/Habits/Goals/Projects/Health/Finance/etc.
pages are scaffolded as placeholders, filled in during later phases.
