import type { DailyLog, Habit, Task, Goal } from "../validation/schemas";

/** Monday-based week key, e.g. "2026-W33". */
export function weekKeyOf(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day + 3); // Thursday of this week (ISO week trick)
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function startOfWeekMonday(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function isHabitDone(log: DailyLog | undefined, habitId: string): boolean {
  if (!log) return false;
  const v = log.habits[habitId];
  return typeof v === "boolean" ? v : typeof v === "number" ? v > 0 : false;
}

/** Current streak counting back from today (breaks on first missed day). */
export function currentStreak(habitId: string, logsByDate: Map<string, DailyLog>): number {
  let streak = 0;
  let cursor = new Date();
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    if (isHabitDone(logsByDate.get(iso), habitId)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function longestStreak(habitId: string, logs: DailyLog[]): number {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let current = 0;
  let prevDate: Date | null = null;
  for (const log of sorted) {
    const done = isHabitDone(log, habitId);
    const d = new Date(log.date + "T00:00:00");
    if (done) {
      if (prevDate && (d.getTime() - prevDate.getTime()) / 86400000 === 1) {
        current++;
      } else {
        current = 1;
      }
      longest = Math.max(longest, current);
      prevDate = d;
    } else {
      current = 0;
      prevDate = null;
    }
  }
  return longest;
}

export function consistencyPct(habitId: string, logs: DailyLog[], windowDays: number): number {
  const cutoff = daysAgoIso(windowDays - 1);
  const relevant = logs.filter((l) => l.date >= cutoff);
  if (relevant.length === 0) return 0;
  const done = relevant.filter((l) => isHabitDone(l, habitId)).length;
  return Math.round((done / windowDays) * 100);
}

export function habitStats(habit: Habit, logs: DailyLog[]) {
  const logsByDate = new Map(logs.map((l) => [l.date, l]));
  return {
    currentStreak: currentStreak(habit.id, logsByDate),
    longestStreak: longestStreak(habit.id, logs),
    weeklyConsistency: consistencyPct(habit.id, logs, 7),
    monthlyConsistency: consistencyPct(habit.id, logs, 30),
  };
}

export function average(nums: number[]): number | null {
  const valid = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

export function weeklySummary(logs: DailyLog[]) {
  return {
    avgSleep: average(logs.map((l) => l.sleep?.hours ?? NaN)),
    avgEnergy: average(logs.map((l) => l.energy ?? NaN)),
    avgMood: average(logs.map((l) => l.mood ?? NaN)),
    avgProductivity: average(logs.map((l) => l.productivity ?? NaN)),
    daysLogged: logs.length,
  };
}

export interface Alert {
  severity: "info" | "warning";
  message: string;
}

/** Deterministic, explainable alerts — no fabricated AI recommendations. */
export function computeAlerts(logs: DailyLog[], habits: Habit[] = []): Alert[] {
  const alerts: Alert[] = [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const withSleep = sorted.filter((l) => l.sleep?.hours !== undefined);

  if (withSleep.length >= 10) {
    const last7 = withSleep.slice(-7).map((l) => l.sleep!.hours!);
    const prior7 = withSleep.slice(-14, -7).map((l) => l.sleep!.hours!);
    const last7Avg = average(last7);
    const prior7Avg = average(prior7);
    if (last7Avg !== null && prior7Avg !== null && last7Avg < prior7Avg - 0.5) {
      alerts.push({
        severity: "warning",
        message: `Sleep has trended down: last 7 days averaged ${last7Avg}h vs ${prior7Avg}h the week before.`,
      });
    }
  }

  for (const habit of habits) {
    const pct = consistencyPct(habit.id, logs, 7);
    if (pct < 40) {
      alerts.push({
        severity: "warning",
        message: `"${habit.name}" has fallen to ${pct}% consistency this week.`,
      });
    }
  }

  return alerts;
}

/**
 * Deterministic, explainable correlation: split days by whether a metric
 * crossed a threshold, compare average of another metric between groups.
 * Never claims causation — output is descriptive only.
 */
export function splitCorrelation(
  logs: DailyLog[],
  splitKey: "sleep" | "energy" | "mood" | "productivity",
  splitThreshold: number,
  targetKey: "energy" | "mood" | "productivity"
): { aboveAvg: number | null; belowAvg: number | null; aboveCount: number; belowCount: number } {
  const getSplitVal = (l: DailyLog) => (splitKey === "sleep" ? l.sleep?.hours : l[splitKey]);
  const above = logs.filter((l) => (getSplitVal(l) ?? -Infinity) >= splitThreshold);
  const below = logs.filter((l) => {
    const v = getSplitVal(l);
    return v !== undefined && v < splitThreshold;
  });
  return {
    aboveAvg: average(above.map((l) => l[targetKey] ?? NaN)),
    belowAvg: average(below.map((l) => l[targetKey] ?? NaN)),
    aboveCount: above.length,
    belowCount: below.length,
  };
}

// ---------- Failure analytics ----------
// Deterministic tracking of things that were due and didn't happen:
// overdue tasks, under-target habit weeks, goals past their deadline
// while still incomplete. No fabricated scoring — just plain counts.

export interface OverdueTask {
  task: Task;
  daysOverdue: number;
}

export function overdueTasks(tasks: Task[], todayIso: string): OverdueTask[] {
  return tasks
    .filter((t) => t.status !== "done" && t.dueDate && t.dueDate < todayIso)
    .map((t) => ({
      task: t,
      daysOverdue: Math.round(
        (new Date(todayIso + "T00:00:00").getTime() - new Date(t.dueDate + "T00:00:00").getTime()) / 86400000
      ),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export interface MissedHabitWeek {
  habit: Habit;
  weeklyConsistency: number;
}

/** Habits under 50% consistency over the last 7 days — a simple, explainable bar. */
export function underperformingHabits(habits: Habit[], logs: DailyLog[]): MissedHabitWeek[] {
  return habits
    .map((h) => ({ habit: h, weeklyConsistency: consistencyPct(h.id, logs, 7) }))
    .filter((h) => h.weeklyConsistency < 50);
}

export interface MissedGoal {
  goal: Goal;
  daysOverdue: number;
}

export function overdueGoals(goals: Goal[], todayIso: string): MissedGoal[] {
  return goals
    .filter((g) => g.status !== "completed" && g.status !== "abandoned" && g.targetDate < todayIso)
    .map((g) => ({
      goal: g,
      daysOverdue: Math.round(
        (new Date(todayIso + "T00:00:00").getTime() - new Date(g.targetDate + "T00:00:00").getTime()) / 86400000
      ),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/** Goal/project completion driven by linked tasks, when any are linked. */
export function completionFromTasks(taskIds: string[], allTasks: Task[]): number | null {
  if (taskIds.length === 0) return null;
  const linked = allTasks.filter((t) => taskIds.includes(t.id));
  if (linked.length === 0) return null;
  const done = linked.filter((t) => t.status === "done").length;
  return Math.round((done / linked.length) * 100);
}
