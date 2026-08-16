import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { DailyLog, Habit } from "../services/validation/schemas";
import { Card, Button, Input, Textarea, Slider, EmptyState } from "../components/ui";
import { isHabitDone } from "../services/analytics/analytics";
import { Check, Plus, Trash2 } from "lucide-react";

const EMPTY_LOG = (date: string): DailyLog => ({
  date,
  habits: {},
  training: [],
  tasks: [],
  expenses: [],
  notes: "",
});

export function TodayPage() {
  const store = useDataStore();
  const params = useParams<{ date?: string }>();
  const date = params.date ?? todayIso();
  const isToday = date === todayIso();
  const [log, setLog] = useState<DailyLog>(EMPTY_LOG(date));
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("General");

  useEffect(() => {
    Promise.all([store.getDailyLog(date), store.getHabits()]).then(([existing, h]) => {
      setLog(existing ?? EMPTY_LOG(date));
      setHabits(h.filter((x) => x.active));
      setLoading(false);
    });
  }, [store, date]);

  const persist = useCallback(
    async (next: DailyLog) => {
      setLog(next);
      setSaving(true);
      await store.saveDailyLog(next);
      setSaving(false);
    },
    [store]
  );

  function toggleHabit(habitId: string) {
    const done = isHabitDone(log, habitId);
    persist({ ...log, habits: { ...log.habits, [habitId]: !done } });
  }

  function addTask() {
    if (!newTaskTitle.trim()) return;
    persist({
      ...log,
      tasks: [...log.tasks, { id: newId(), title: newTaskTitle.trim(), done: false }],
    });
    setNewTaskTitle("");
  }

  function toggleTask(id: string) {
    persist({
      ...log,
      tasks: log.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  }

  function removeTask(id: string) {
    persist({ ...log, tasks: log.tasks.filter((t) => t.id !== id) });
  }

  function addExpense() {
    const amount = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || Number.isNaN(amount)) return;
    persist({
      ...log,
      expenses: [
        ...log.expenses,
        { id: newId(), description: expenseDesc.trim(), amount, category: expenseCategory },
      ],
    });
    setExpenseDesc("");
    setExpenseAmount("");
  }

  function removeExpense(id: string) {
    persist({ ...log, expenses: log.expenses.filter((e) => e.id !== id) });
  }

  if (loading) return <div className="p-8 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{isToday ? "Today" : "Daily Log"}</h1>
          <p className="text-sm text-ink-muted">{date}</p>
        </div>
        {saving && <span className="text-xs text-ink-faint">Saving…</span>}
      </div>

      <Card title="How was it">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Slider label="Sleep quality" value={log.sleep?.quality} onChange={(v) => persist({ ...log, sleep: { ...log.sleep, quality: v } })} />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-ink-muted">Sleep hours</span>
              <span className="text-sm font-medium text-ink">{log.sleep?.hours ?? "—"}</span>
            </div>
            <Input
              type="number"
              step={0.5}
              min={0}
              max={24}
              value={log.sleep?.hours ?? ""}
              onChange={(e) => persist({ ...log, sleep: { ...log.sleep, hours: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="e.g. 7.5"
            />
          </div>
          <Slider label="Energy" value={log.energy} onChange={(v) => persist({ ...log, energy: v })} />
          <Slider label="Mood" value={log.mood} onChange={(v) => persist({ ...log, mood: v })} />
          <Slider label="Productivity" value={log.productivity} onChange={(v) => persist({ ...log, productivity: v })} />
        </div>
      </Card>

      <Card title="Habits">
        {habits.length === 0 ? (
          <EmptyState message="No active habits yet. Add some on the Habits page." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {habits.map((h) => {
              const done = isHabitDone(log, h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    done
                      ? "bg-accent-muted border-accent text-accent font-medium"
                      : "bg-surface-raised border-border text-ink-muted hover:text-ink"
                  }`}
                >
                  <Check size={14} className={done ? "opacity-100" : "opacity-0"} />
                  {h.name}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Priorities & tasks">
        <div className="flex gap-2 mb-3">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a task for today…"
          />
          <Button onClick={addTask}>
            <Plus size={14} />
          </Button>
        </div>
        {log.tasks.length === 0 ? (
          <EmptyState message="Nothing added yet." />
        ) : (
          <ul className="space-y-1.5">
            {log.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleTask(t.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    t.done ? "bg-accent border-accent" : "border-border"
                  }`}
                >
                  {t.done && <Check size={11} className="text-white" />}
                </button>
                <span className={`text-sm flex-1 ${t.done ? "line-through text-ink-faint" : "text-ink"}`}>{t.title}</span>
                <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-opacity">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Expenses today">
        <div className="flex gap-2 mb-3">
          <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Description" className="flex-1" />
          <Input
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            type="number"
            step={0.01}
            placeholder="Amount"
            className="w-28"
          />
          <Input value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} placeholder="Category" className="w-32" />
          <Button onClick={addExpense}>
            <Plus size={14} />
          </Button>
        </div>
        {log.expenses.length === 0 ? (
          <EmptyState message="No expenses logged today." />
        ) : (
          <ul className="space-y-1.5">
            {log.expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm group">
                <span className="flex-1 text-ink">{e.description}</span>
                <span className="text-ink-muted">{e.category}</span>
                <span className="font-medium text-ink w-16 text-right">${e.amount.toFixed(2)}</span>
                <button onClick={() => removeExpense(e.id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-opacity">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Notes">
        <Textarea
          value={log.notes}
          onChange={(e) => persist({ ...log, notes: e.target.value })}
          rows={4}
          placeholder="Anything worth remembering about today…"
        />
      </Card>
    </div>
  );
}
