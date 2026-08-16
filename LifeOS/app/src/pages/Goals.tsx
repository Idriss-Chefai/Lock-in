import { useEffect, useState } from "react";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { Goal, Task } from "../services/validation/schemas";
import { completionFromTasks } from "../services/analytics/analytics";
import { Card, Button, Input, Select, Badge, EmptyState, ProgressBar, Textarea } from "../components/ui";
import { Plus, Trash2 } from "lucide-react";

const STATUS_TONE: Record<Goal["status"], "neutral" | "success" | "warning"> = {
  not_started: "neutral",
  in_progress: "warning",
  completed: "success",
  abandoned: "neutral",
};

const TIER_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly" },
];

export function GoalsPage() {
  const store = useDataStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<"all" | Goal["tier"]>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    tier: "weekly" as Goal["tier"],
    metric: "",
    targetValue: "100",
    targetDate: "",
  });

  async function refresh() {
    const [g, t] = await Promise.all([store.getGoals(), store.getTasks()]);
    setGoals(g);
    setTasks(t);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [store]);

  async function addGoal() {
    if (!form.title.trim() || !form.metric.trim()) return;
    await store.saveGoal({
      id: newId(),
      title: form.title.trim(),
      description: form.description,
      tier: form.tier,
      startDate: todayIso(),
      targetDate: form.targetDate || todayIso(),
      metric: form.metric,
      currentValue: 0,
      targetValue: Number(form.targetValue) || 100,
      status: "not_started",
      taskIds: [],
    });
    setForm({ title: "", description: "", tier: "weekly", metric: "", targetValue: "100", targetDate: "" });
    setShowForm(false);
    refresh();
  }

  async function updateProgress(g: Goal, value: number) {
    const status: Goal["status"] = value >= g.targetValue ? "completed" : value > 0 ? "in_progress" : "not_started";
    await store.saveGoal({ ...g, currentValue: value, status });
    refresh();
  }

  async function toggleTaskLink(g: Goal, taskId: string) {
    const taskIds = g.taskIds.includes(taskId) ? g.taskIds.filter((id) => id !== taskId) : [...g.taskIds, taskId];
    await store.saveGoal({ ...g, taskIds });
    refresh();
  }

  async function removeGoal(id: string) {
    await store.deleteGoal(id);
    refresh();
  }

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  const filtered = tierFilter === "all" ? goals : goals.filter((g) => g.tier === tierFilter);

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Goals</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> New goal
        </Button>
      </div>

      <div className="flex gap-1.5">
        {(["all", "daily", "weekly", "yearly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              tierFilter === t ? "bg-accent text-white" : "bg-surface-raised text-ink-muted hover:bg-surface-sunken"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {showForm && (
        <Card title="New goal">
          <div className="space-y-3">
            <Input
              placeholder="Title (e.g. Launch Project X)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
            <div className="flex gap-2">
              <Select value={form.tier} onChange={(v) => setForm({ ...form, tier: v as Goal["tier"] })} options={TIER_OPTIONS} />
              <Input
                placeholder="Metric (e.g. % complete)"
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Target value"
                type="number"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                className="w-28"
              />
              <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className="w-40" />
            </div>
            <Button onClick={addGoal}>Save goal</Button>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="No goals in this tier yet." />
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const taskDriven = completionFromTasks(g.taskIds, tasks);
            const pct = taskDriven ?? (g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0);
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{g.title}</span>
                      <Badge tone="accent">{g.tier}</Badge>
                      <Badge tone={STATUS_TONE[g.status]}>{g.status.replace("_", " ")}</Badge>
                    </div>
                    {g.description && <p className="text-sm text-ink-muted mt-0.5">{g.description}</p>}
                    <p className="text-xs text-ink-faint mt-1">
                      Target: {g.targetValue} {g.metric} by {g.targetDate}
                      {taskDriven !== null && " · driven by linked tasks"}
                    </p>
                  </div>
                  <button onClick={() => removeGoal(g.id)} className="text-ink-faint hover:text-danger p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={pct} />
                  <span className="text-xs text-ink-faint w-10 text-right">{pct}%</span>
                </div>

                {taskDriven === null && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={g.currentValue}
                      onChange={(e) => updateProgress(g, Number(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-xs text-ink-faint">
                      / {g.targetValue} {g.metric}
                    </span>
                  </div>
                )}

                <details className="mt-2">
                  <summary className="text-xs text-accent cursor-pointer hover:underline">
                    Link tasks ({g.taskIds.length} linked)
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-ink-faint">No tasks yet — add some on the Tasks page.</p>
                    ) : (
                      tasks.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-xs text-ink-muted">
                          <input
                            type="checkbox"
                            checked={g.taskIds.includes(t.id)}
                            onChange={() => toggleTaskLink(g, t.id)}
                          />
                          <span className={t.status === "done" ? "line-through text-ink-faint" : ""}>{t.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
