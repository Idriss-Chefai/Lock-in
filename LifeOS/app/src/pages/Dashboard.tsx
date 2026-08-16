import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";
import { useDataStore } from "../services/datastore/context";
import { todayIso } from "../services/id";
import {
  daysAgoIso,
  weeklySummary,
  computeAlerts,
  isHabitDone,
  habitStats,
  overdueTasks,
  average,
} from "../services/analytics/analytics";
import type { DailyLog, Habit, Goal, Project, Transaction, Task } from "../services/validation/schemas";
import { Card, Badge, EmptyState, ProgressBar } from "../components/ui";
import { AlertTriangle, Flame, CalendarRange, CheckCircle2, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const FALLBACK_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
];

function useDailyQuote() {
  const [quote, setQuote] = useState(FALLBACK_QUOTES[0]);

  useEffect(() => {
    // Deterministic fallback pick so it doesn't flicker before the fetch resolves.
    const dayIndex = new Date().getDate() % FALLBACK_QUOTES.length;
    setQuote(FALLBACK_QUOTES[dayIndex]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    fetch("https://api.quotable.io/random?tags=motivational|inspirational", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data?.content) setQuote({ text: data.content, author: data.author ?? "Unknown" });
      })
      .catch(() => {
        // Offline or blocked — the deterministic fallback above already covers this.
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  return quote;
}

function Sparkline({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) {
  if (data.every((d) => d[dataKey] == null)) return <div className="h-8" />;
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DashboardPage() {
  const store = useDataStore();
  const [today, setToday] = useState<DailyLog | null>(null);
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);
  const [monthLogs, setMonthLogs] = useState<DailyLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const quote = useDailyQuote();

  useEffect(() => {
    const date = todayIso();
    Promise.all([
      store.getDailyLog(date),
      store.listDailyLogs(daysAgoIso(6), date),
      store.listDailyLogs(daysAgoIso(29), date),
      store.getHabits(),
      store.getGoals(),
      store.getProjects(),
      store.getTasks(),
      store.getTransactions(date.slice(0, 7)),
      store.getSettings(),
    ]).then(([t, week, month, h, g, p, tk, tx, settings]) => {
      setToday(t);
      setWeekLogs(week.sort((a, b) => a.date.localeCompare(b.date)));
      setMonthLogs(month.sort((a, b) => a.date.localeCompare(b.date)));
      setHabits(h.filter((x) => x.active));
      setGoals(g.filter((x) => x.status !== "completed" && x.status !== "abandoned"));
      setProjects(p);
      setTasks(tk);
      setTransactions(tx);
      setName(settings.name);
      setLoading(false);
    });
  }, [store]);

  if (loading) return <div className="p-8 text-sm text-ink-faint">Loading…</div>;

  const weekSummary = weeklySummary(weekLogs);
  const alerts = computeAlerts(monthLogs, habits);
  const habitsDoneToday = today ? habits.filter((h) => isHabitDone(today, h.id)).length : 0;
  const activeProjects = projects.filter((p) => p.status === "active");
  const openTasks = tasks.filter((task) => task.status !== "done");
  const overdue = overdueTasks(tasks, todayIso());

  const monthAvgSleep = average(monthLogs.map((l) => l.sleep?.hours ?? NaN));
  const monthAvgMood = average(monthLogs.map((l) => l.mood ?? NaN));
  const monthAvgEnergy = average(monthLogs.map((l) => l.energy ?? NaN));
  const monthAvgProductivity = average(monthLogs.map((l) => l.productivity ?? NaN));

  const sparkData = weekLogs.map((l) => ({
    date: l.date.slice(5),
    sleep: l.sleep?.hours ?? null,
    energy: l.energy ?? null,
    mood: l.mood ?? null,
    productivity: l.productivity ?? null,
  }));

  const monthHealthData = monthLogs.map((l) => ({
    date: l.date.slice(5),
    sleep: l.sleep?.hours ?? null,
    mood: l.mood ?? null,
    productivity: l.productivity ?? null,
    habitsDone: habits.filter((habit) => isHabitDone(l, habit.id)).length,
  }));

  const expensesByDay = weekLogs.map((l) => ({
    date: l.date.slice(5),
    amount: l.expenses.reduce((s, e) => s + e.amount, 0),
  }));

  const monthExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const cashFlow = monthIncome - monthExpenses;

  const topHabits = habits.slice(0, 4).map((h) => ({ habit: h, stats: habitStats(h, monthLogs) }));
  const projectProgressData = activeProjects.slice(0, 5).map((p) => ({ name: p.name, progress: p.progress, hours: p.hoursInvested }));

  return (
    <div className="p-6 max-w-[1600px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Welcome{name ? `, ${name}` : ""}
          </h1>
          <p className="text-xs text-ink-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="bg-accent-muted border border-accent/20 rounded-xl px-4 py-3">
        <p className="text-sm text-ink italic">"{quote.text}"</p>
        <p className="text-xs text-ink-faint mt-1">— {quote.author}</p>
      </div>

      {alerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm bg-warning/10 border border-warning/20 rounded-lg px-3 py-2"
            >
              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
              <span className="text-ink">{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricTile label="Avg sleep" value={monthAvgSleep ? `${monthAvgSleep}h` : "—"} sub="last 30d" icon={<CalendarRange size={12} />} />
        <MetricTile label="Avg mood" value={monthAvgMood ?? "—"} sub="/10" icon={<TrendingUp size={12} />} />
        <MetricTile label="Habits done" value={`${habitsDoneToday}/${habits.length}`} sub="today" icon={<CheckCircle2 size={12} />} />
        <MetricTile label="Cash flow" value={`$${cashFlow.toFixed(0)}`} sub="this month" icon={<TrendingUp size={12} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Last 30 days — health & focus" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthHealthData}>
              <defs>
                <linearGradient id="sleepFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(monthHealthData.length / 6) - 1)} />
              <YAxis tick={{ fontSize: 10 }} width={24} />
              <Tooltip />
              <Area type="monotone" dataKey="sleep" stroke="#8b5cf6" fill="url(#sleepFill)" strokeWidth={2} name="Sleep" />
              <Line type="monotone" dataKey="mood" stroke="#22c55e" strokeWidth={2} dot={false} name="Mood" />
              <Line type="monotone" dataKey="productivity" stroke="var(--accent)" strokeWidth={2} dot={false} name="Productivity" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border text-center">
            <Stat label="Avg sleep" value={monthAvgSleep ? `${monthAvgSleep}h` : "—"} />
            <Stat label="Avg energy" value={monthAvgEnergy ?? "—"} />
            <Stat label="Avg mood" value={monthAvgMood ?? "—"} />
            <Stat label="Avg product." value={monthAvgProductivity ?? "—"} />
          </div>
        </Card>

        <Card title="Habit momentum">
          {topHabits.length === 0 ? (
            <EmptyState message="No active habits yet." />
          ) : (
            <div className="space-y-3">
              {topHabits.map(({ habit, stats }) => (
                <div key={habit.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-ink flex items-center gap-1.5">
                      {stats.currentStreak > 0 && <Flame size={12} className="text-warning" />}
                      {habit.name}
                    </span>
                    <span className="text-ink-faint text-xs">{stats.currentStreak}d</span>
                  </div>
                  <ProgressBar value={stats.weeklyConsistency} />
                </div>
              ))}
            </div>
          )}
          <Link to="/habits" className="text-xs text-accent hover:underline mt-3 inline-block">
            Manage habits →
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Project momentum">
          {projectProgressData.length === 0 ? (
            <EmptyState message="No active projects." />
          ) : (
            <div className="space-y-3">
              {projectProgressData.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink truncate">{p.name}</span>
                    <span className="text-ink-faint">{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="This month — work">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-ink-faint">Open tasks</p>
              <p className="text-lg font-semibold text-ink">{openTasks.length}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Overdue</p>
              <p className="text-lg font-semibold text-danger">{overdue.length}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-ink-faint">Focus trend</p>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={monthHealthData.slice(-7)}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="habitsDone" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="This month — finance">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-ink-faint">Income</p>
              <p className="text-lg font-semibold text-success">${monthIncome.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Expenses</p>
              <p className="text-lg font-semibold text-ink">${monthExpenses.toFixed(0)}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={expensesByDay}>
              <Bar dataKey="amount" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-ink-faint mt-2">Daily spending, last 7 days</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Goals & Projects">
          {goals.length === 0 && activeProjects.length === 0 ? (
            <EmptyState message="No active goals or projects." />
          ) : (
            <div className="space-y-2.5">
              {goals.slice(0, 3).map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-ink truncate">{g.title}</span>
                    <Badge tone="accent">
                      {g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0}%
                    </Badge>
                  </div>
                  <ProgressBar
                    value={g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0}
                  />
                </div>
              ))}
              {activeProjects.slice(0, 3).map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-ink truncate">{p.name}</span>
                    <Badge tone="accent">{p.progress}%</Badge>
                  </div>
                  <ProgressBar value={p.progress} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="7-day trends" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <TrendBlock label="Sleep (h)" color="#8b5cf6" data={sparkData} dataKey="sleep" />
            <TrendBlock label="Energy" color="#f59e0b" data={sparkData} dataKey="energy" />
            <TrendBlock label="Mood" color="#22c55e" data={sparkData} dataKey="mood" />
            <TrendBlock label="Productivity" color="var(--accent)" data={sparkData} dataKey="productivity" />
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border text-center">
            <Stat label="Avg sleep" value={weekSummary.avgSleep ? `${weekSummary.avgSleep}h` : "—"} />
            <Stat label="Avg energy" value={weekSummary.avgEnergy ?? "—"} />
            <Stat label="Avg mood" value={weekSummary.avgMood ?? "—"} />
            <Stat label="Days logged" value={`${weekSummary.daysLogged}/7`} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
        {icon}
      </div>
      <p className="text-lg font-semibold text-ink leading-tight">
        {value} <span className="text-xs font-normal text-ink-faint">{sub}</span>
      </p>
    </div>
  );
}

function TrendBlock({
  label,
  color,
  data,
  dataKey,
}: {
  label: string;
  color: string;
  data: any[];
  dataKey: string;
}) {
  return (
    <div>
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <Sparkline data={data} dataKey={dataKey} color={color} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-faint uppercase tracking-wide">{label}</p>
    </div>
  );
}
