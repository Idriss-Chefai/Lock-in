import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDataStore } from "../services/datastore/context";
import {
  daysAgoIso,
  splitCorrelation,
  habitStats,
  overdueTasks,
  underperformingHabits,
  overdueGoals,
} from "../services/analytics/analytics";
import { todayIso } from "../services/id";
import type { DailyLog, Habit, Goal, Project, Task, WeightEntry } from "../services/validation/schemas";
import { Card, EmptyState, Badge } from "../components/ui";
import { AlertTriangle } from "lucide-react";

const PIE_COLORS = ["var(--accent)", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

export function AnalyticsPage() {
  const store = useDataStore();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [weight, setWeight] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      store.listDailyLogs(daysAgoIso(89), todayIso()),
      store.getHabits(),
      store.getGoals(),
      store.getTasks(),
      store.getProjects(),
      store.getWeightEntries(),
    ]).then(([l, h, g, tk, p, w]) => {
      setLogs(l.sort((a, b) => a.date.localeCompare(b.date)));
      setHabits(h.filter((x) => x.active));
      setGoals(g);
      setTasks(tk);
      setProjects(p);
      setWeight(w.sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
    });
  }, [store]);

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  if (logs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold text-ink mb-4">Analytics</h1>
        <EmptyState message="Log a few days on the Today page to see trends and correlations here." />
      </div>
    );
  }

  const chartData = logs.map((l) => ({
    date: l.date.slice(5),
    sleep: l.sleep?.hours ?? null,
    energy: l.energy ?? null,
    mood: l.mood ?? null,
    productivity: l.productivity ?? null,
  }));

  const spendData = logs.map((l) => ({
    date: l.date.slice(5),
    amount: l.expenses.reduce((s, e) => s + e.amount, 0),
  }));

  const habitConsistency = habits.map((h) => ({
    name: h.name,
    weekly: habitStats(h, logs).weeklyConsistency,
    monthly: habitStats(h, logs).monthlyConsistency,
  }));

  const activeProjects = projects.filter((p) => p.status === "active" && p.hoursInvested > 0);
  const timeAllocation = activeProjects.map((p) => ({ name: p.name, value: p.hoursInvested }));

  const sleepVsProductivity = splitCorrelation(logs, "sleep", 7, "productivity");
  const energyVsProductivity = splitCorrelation(logs, "energy", 7, "productivity");
  const sleepVsMood = splitCorrelation(logs, "sleep", 7, "mood");
  const sleepVsEnergy = splitCorrelation(logs, "sleep", 7, "energy");

  const overdue = overdueTasks(tasks, todayIso());
  const missedHabits = underperformingHabits(habits, logs);
  const missedGoals = overdueGoals(goals, todayIso());

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Analytics</h1>
        <p className="text-xs text-ink-muted">Last 90 days · {logs.length} days logged</p>
      </div>

      <Card title="Sleep, energy, mood, productivity">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} width={28} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="sleep" stroke="#8b5cf6" dot={false} name="Sleep (h)" connectNulls />
            <Line type="monotone" dataKey="energy" stroke="#f59e0b" dot={false} name="Energy" connectNulls />
            <Line type="monotone" dataKey="mood" stroke="#22c55e" dot={false} name="Mood" connectNulls />
            <Line
              type="monotone"
              dataKey="productivity"
              stroke="var(--accent)"
              dot={false}
              name="Productivity"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Habit consistency">
          {habitConsistency.length === 0 ? (
            <EmptyState message="No active habits yet." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, habitConsistency.length * 34)}>
              <BarChart data={habitConsistency} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="weekly" name="7-day %" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Spending trend">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip />
              <Bar dataKey="amount" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Weight trend">
          {weight.length < 2 ? (
            <EmptyState message="Not enough weight entries yet." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weight}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} hide />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} width={32} />
                <Tooltip />
                <Line type="monotone" dataKey="kg" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Time allocation — active projects">
          {timeAllocation.length === 0 ? (
            <EmptyState message="Log hours invested on active projects to see this." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={timeAllocation} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                  {timeAllocation.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Descriptive comparisons (not causal)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CorrelationRow
            label="Sleep ≥ 7h vs productivity"
            result={sleepVsProductivity}
            aboveLabel="Sleep ≥ 7h"
            belowLabel="Sleep < 7h"
            targetLabel="avg productivity"
          />
          <CorrelationRow
            label="Energy ≥ 7 vs productivity"
            result={energyVsProductivity}
            aboveLabel="Energy ≥ 7"
            belowLabel="Energy < 7"
            targetLabel="avg productivity"
          />
          <CorrelationRow
            label="Sleep ≥ 7h vs mood"
            result={sleepVsMood}
            aboveLabel="Sleep ≥ 7h"
            belowLabel="Sleep < 7h"
            targetLabel="avg mood"
          />
          <CorrelationRow
            label="Sleep ≥ 7h vs energy"
            result={sleepVsEnergy}
            aboveLabel="Sleep ≥ 7h"
            belowLabel="Sleep < 7h"
            targetLabel="avg energy"
          />
        </div>
        <p className="text-xs text-ink-faint mt-4">
          These are simple group averages, not evidence of cause and effect.
        </p>
      </Card>

      <Card title="Failure analytics">
        <p className="text-xs text-ink-muted mb-3">
          Plain counts of what was due and didn't happen — no scoring, just visibility.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-ink-faint mb-1.5">Overdue tasks ({overdue.length})</p>
            {overdue.length === 0 ? (
              <p className="text-xs text-ink-faint">None — nice.</p>
            ) : (
              <ul className="space-y-1">
                {overdue.slice(0, 5).map(({ task, daysOverdue }) => (
                  <li key={task.id} className="flex items-center gap-1.5 text-xs">
                    <AlertTriangle size={11} className="text-danger shrink-0" />
                    <span className="text-ink truncate flex-1">{task.title}</span>
                    <Badge tone="danger">{daysOverdue}d</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-faint mb-1.5">Habits under 50% this week ({missedHabits.length})</p>
            {missedHabits.length === 0 ? (
              <p className="text-xs text-ink-faint">None — nice.</p>
            ) : (
              <ul className="space-y-1">
                {missedHabits.map(({ habit, weeklyConsistency }) => (
                  <li key={habit.id} className="flex items-center gap-1.5 text-xs">
                    <span className="text-ink truncate flex-1">{habit.name}</span>
                    <Badge tone="warning">{weeklyConsistency}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-faint mb-1.5">Goals past deadline ({missedGoals.length})</p>
            {missedGoals.length === 0 ? (
              <p className="text-xs text-ink-faint">None — nice.</p>
            ) : (
              <ul className="space-y-1">
                {missedGoals.map(({ goal, daysOverdue }) => (
                  <li key={goal.id} className="flex items-center gap-1.5 text-xs">
                    <span className="text-ink truncate flex-1">{goal.title}</span>
                    <Badge tone="danger">{daysOverdue}d</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function CorrelationRow({
  label,
  result,
  aboveLabel,
  belowLabel,
  targetLabel,
}: {
  label: string;
  result: ReturnType<typeof splitCorrelation>;
  aboveLabel: string;
  belowLabel: string;
  targetLabel: string;
}) {
  if (result.aboveCount === 0 && result.belowCount === 0) {
    return <p className="text-sm text-ink-faint">{label}: not enough data yet.</p>;
  }
  return (
    <div>
      <p className="text-sm text-ink mb-1">{label}</p>
      <p className="text-sm text-ink-muted">
        On days with <span className="text-ink font-medium">{aboveLabel}</span> ({result.aboveCount} days),{" "}
        {targetLabel} was <span className="text-ink font-medium">{result.aboveAvg ?? "—"}</span>, compared with{" "}
        <span className="text-ink font-medium">{result.belowAvg ?? "—"}</span> on days with{" "}
        <span className="text-ink font-medium">{belowLabel}</span> ({result.belowCount} days).
      </p>
    </div>
  );
}
