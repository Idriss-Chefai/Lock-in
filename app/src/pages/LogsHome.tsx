import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  Brush,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useDataStore } from "../services/datastore/context";
import { daysAgoIso } from "../services/analytics/analytics";
import { todayIso } from "../services/id";
import { isHabitDone, overdueTasks } from "../services/analytics/analytics";
import type { DailyLog, Habit, Task } from "../services/validation/schemas";
import { Card, Badge, EmptyState } from "../components/ui";
import { AlertTriangle } from "lucide-react";

export function LogsHomePage() {
  const store = useDataStore();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayIso();
    Promise.all([
      store.listDailyLogs(daysAgoIso(29), today),
      store.getHabits(),
      store.getTasks(),
    ]).then(([entries, h, tk]) => {
      setLogs(entries.sort((a, b) => a.date.localeCompare(b.date)));
      setHabits(h.filter((x) => x.active));
      setTasks(tk);
      setLoading(false);
    });
  }, [store]);

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  const today = todayIso();
  const todayLog = logs.find((log) => log.date === today) ?? null;
  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdue = overdueTasks(tasks, today);
  const last7Days = logs.filter((log) => log.date >= daysAgoIso(6));
  const loggedThisWeek = last7Days.length;
  const journalConsistency = Math.round((logs.length / 30) * 100);
  const doneBeforeDeadline = tasks.filter((task) => task.dueDate && task.status === "done").length;
  const tasksWithDueDate = tasks.filter((task) => task.dueDate).length;
  const deadlineRate = tasksWithDueDate > 0 ? Math.round((doneBeforeDeadline / tasksWithDueDate) * 100) : 0;
  const habitConsistency = habits.length > 0
    ? Math.round(
        (logs.filter((log) => habits.some((habit) => isHabitDone(log, habit.id))).length / Math.max(logs.length, 1)) * 100
      )
    : 0;

  const logTrend = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const iso = date.toISOString().slice(0, 10);
    const log = logs.find((entry) => entry.date === iso);
    return {
      date: iso.slice(5),
      logs: log ? 1 : 0,
      habitsDone: log ? habits.filter((habit) => isHabitDone(log, habit.id)).length : 0,
      taskCount: log ? log.tasks.filter((task) => !task.done).length : 0,
    };
  });

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Logs</h1>
        <p className="text-xs text-ink-muted">Daily tracking, habits, journaling consistency, and task flow.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <Card title="Logged this week">
          <p className="text-2xl font-semibold text-ink">{loggedThisWeek}</p>
          <p className="text-xs text-ink-faint">days / 7</p>
        </Card>
        <Card title="Journal consistency">
          <p className="text-2xl font-semibold text-ink">{journalConsistency}%</p>
          <p className="text-xs text-ink-faint">last 30 days</p>
        </Card>
        <Card title="Habit consistency">
          <p className="text-2xl font-semibold text-ink">{habitConsistency}%</p>
          <p className="text-xs text-ink-faint">days with a habit hit</p>
        </Card>
        <Card title="Tasks on time">
          <p className="text-2xl font-semibold text-ink">{deadlineRate}%</p>
          <p className="text-xs text-ink-faint">with due dates</p>
        </Card>
        <Card title="Open tasks">
          <p className="text-2xl font-semibold text-ink">{openTasks.length}</p>
          <p className="text-xs text-ink-faint">{overdue.length} overdue</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Tracking rhythm — last 30 days">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={logTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.ceil(logTrend.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} day${value === 1 ? "" : "s"}`, "Entries"]} />
              <Bar dataKey="logs" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Brush dataKey="date" height={18} stroke="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Habits & task load">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={logTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.ceil(logTrend.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [`${value} ${name === "habitsDone" ? "habit hits" : "open tasks"}`, name === "habitsDone" ? "Habits done" : "Open tasks"]} />
              <Line type="monotone" dataKey="habitsDone" stroke="#22c55e" strokeWidth={2} dot={false} name="habitsDone" />
              <Line type="monotone" dataKey="taskCount" stroke="#f59e0b" strokeWidth={2} dot={false} name="taskCount" />
              <Brush dataKey="date" height={18} stroke="var(--accent)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {overdue.length > 0 && (
        <Card title="Overdue tasks">
          <ul className="space-y-1.5">
            {overdue.slice(0, 5).map(({ task, daysOverdue }) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <AlertTriangle size={13} className="text-danger shrink-0" />
                <span className="flex-1 text-ink">{task.title}</span>
                <Badge tone="danger">{daysOverdue}d overdue</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!todayLog && <EmptyState message="No entry yet today. Head to Today to log it (press L)." />}

      <div className="flex gap-4 text-sm flex-wrap">
        <Link to="/today" className="text-accent hover:underline">Today →</Link>
        <Link to="/tasks" className="text-accent hover:underline">Tasks →</Link>
        <Link to="/habits" className="text-accent hover:underline">Habits →</Link>
        <Link to="/journal" className="text-accent hover:underline">Journal →</Link>
        <Link to="/reviews" className="text-accent hover:underline">Reviews →</Link>
      </div>
    </div>
  );
}
