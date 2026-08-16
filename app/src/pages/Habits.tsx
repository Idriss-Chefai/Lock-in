import { useEffect, useState } from "react";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { Habit, DailyLog } from "../services/validation/schemas";
import { Card, Button, Input, Select, Badge, EmptyState, ProgressBar } from "../components/ui";
import { habitStats, daysAgoIso } from "../services/analytics/analytics";
import { Plus, Trash2, Flame } from "lucide-react";

export function HabitsPage() {
  const store = useDataStore();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<Habit["frequency"]>("daily");
  const [target, setTarget] = useState("1");

  async function refresh() {
    const [h, l] = await Promise.all([store.getHabits(), store.listDailyLogs(daysAgoIso(90), todayIso())]);
    setHabits(h);
    setLogs(l);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [store]);

  async function addHabit() {
    if (!name.trim()) return;
    await store.saveHabit({
      id: newId(),
      name: name.trim(),
      frequency,
      target: Number(target) || 1,
      active: true,
      createdAt: todayIso(),
    });
    setName("");
    setTarget("1");
    refresh();
  }

  async function toggleActive(h: Habit) {
    await store.saveHabit({ ...h, active: !h.active });
    refresh();
  }

  async function removeHabit(id: string) {
    await store.deleteHabit(id);
    refresh();
  }

  if (loading) return <div className="p-8 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl space-y-5">
      <h1 className="text-xl font-semibold text-ink">Habits</h1>

      <Card title="Add a habit">
        <div className="flex gap-2 items-center flex-wrap">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit name (e.g. Gym)" className="flex-1 min-w-[180px]" onKeyDown={(e) => e.key === "Enter" && addHabit()} />
          <Select
            value={frequency}
            onChange={(v) => setFrequency(v as Habit["frequency"])}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "custom", label: "Custom" },
            ]}
          />
          <Input value={target} onChange={(e) => setTarget(e.target.value)} type="number" min={1} placeholder="Target" className="w-20" />
          <Button onClick={addHabit}>
            <Plus size={14} />
          </Button>
        </div>
      </Card>

      {habits.length === 0 ? (
        <EmptyState message="No habits yet — add your first one above." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((h) => {
            const stats = habitStats(h, logs);
            return (
              <Card key={h.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{h.name}</span>
                      {!h.active && <Badge>inactive</Badge>}
                    </div>
                    <span className="text-xs text-ink-faint capitalize">{h.frequency} · target {h.target}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(h)} className="text-xs text-ink-muted hover:text-ink px-2 py-1">
                      {h.active ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => removeHabit(h.id)} className="text-ink-faint hover:text-danger p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Flame size={14} className="text-warning" />
                  <span className="text-sm text-ink">{stats.currentStreak} day streak</span>
                  <span className="text-xs text-ink-faint ml-2">longest: {stats.longestStreak}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-ink-faint mb-1">
                      <span>Weekly consistency</span>
                      <span>{stats.weeklyConsistency}%</span>
                    </div>
                    <ProgressBar value={stats.weeklyConsistency} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-ink-faint mb-1">
                      <span>Monthly consistency</span>
                      <span>{stats.monthlyConsistency}%</span>
                    </div>
                    <ProgressBar value={stats.monthlyConsistency} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
