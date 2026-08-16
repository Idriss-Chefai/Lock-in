import { Card } from "../components/ui";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="px-1.5 py-0.5 bg-surface-raised border border-border rounded text-xs font-mono">
      {children}
    </kbd>
  );
}

export function GuidePage() {
  return (
    <div className="p-8 max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Guide</h1>
        <p className="text-sm text-ink-muted">How LifeOS is meant to be used, day to day.</p>
      </div>

      <Card title="Daily workflow">
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-ink-muted">
          <li>Open <span className="text-ink">Today</span> each morning or evening — log sleep, energy, mood, productivity.</li>
          <li>Tap habits you completed. Add any tasks or expenses as they happen.</li>
          <li>Once a week, do a <span className="text-ink">Review</span> — it auto-fills your averages, you add reflection.</li>
          <li>Check <span className="text-ink">Dashboard</span> whenever you want the big picture, not raw data.</li>
        </ol>
      </Card>

      <Card title="Keyboard shortcuts">
        <p className="text-xs text-ink-faint mb-3">
          Work anywhere except while typing in a text field.
        </p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex items-center gap-2"><Kbd>L</Kbd> <span className="text-ink-muted">Daily log (Today)</span></div>
          <div className="flex items-center gap-2"><Kbd>N</Kbd> <span className="text-ink-muted">New task</span></div>
          <div className="flex items-center gap-2"><Kbd>H</Kbd> <span className="text-ink-muted">Habits</span></div>
          <div className="flex items-center gap-2"><Kbd>E</Kbd> <span className="text-ink-muted">Log an expense</span></div>
          <div className="flex items-center gap-2"><Kbd>G</Kbd> <span className="text-ink-muted">Goals</span></div>
          <div className="flex items-center gap-2"><Kbd>P</Kbd> <span className="text-ink-muted">Projects</span></div>
        </div>
      </Card>

      <Card title="Where your data lives">
        <p className="text-sm text-ink-muted">
          Everything is plain JSON under <code className="text-xs bg-surface-raised px-1 py-0.5 rounded">data/</code> in
          this project folder — one file per day, month, or entity type. Nothing is sent anywhere.
          Commit that folder to Git yourself whenever you want a version history; LifeOS never commits automatically.
        </p>
      </Card>

      <Card title="Backing up">
        <p className="text-sm text-ink-muted">
          Go to <span className="text-ink">Settings → Data management</span>. "Export" downloads a full JSON
          snapshot you can save anywhere. "Backup now" saves a timestamped snapshot into the project's{" "}
          <code className="text-xs bg-surface-raised px-1 py-0.5 rounded">exports/</code> folder. "Import" restores
          from a previously exported file — it validates everything before writing, so a bad file can't corrupt
          your existing data.
        </p>
      </Card>

      <Card title="Reading the Analytics page">
        <p className="text-sm text-ink-muted">
          The comparisons shown (e.g. "productivity on days with sleep ≥ 7h vs below") are simple group averages,
          not proof that one causes the other. Use them as a prompt to notice patterns, not as a verdict.
        </p>
      </Card>
    </div>
  );
}
