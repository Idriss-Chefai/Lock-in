import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { FocusSession, Skill } from "../services/validation/schemas";
import { Button, Card, EmptyState, Input } from "../components/ui";
import { Plus } from "lucide-react";

const COLORS = ["var(--accent)", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function weekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="text-2xl font-semibold text-ink mt-1">{value}</div>
      <div className="text-[11px] text-ink-muted mt-1">{sub}</div>
    </Card>
  );
}

export function SkillsPage() {
  const store = useDataStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [skillList, availableMonths] = await Promise.all([store.getSkills(), store.listAvailableFocusMonths()]);
    const cutoff = dateDaysAgo(89);
    const sessionLists = await Promise.all(availableMonths.map((month) => store.getFocusSessions(month)));
    setSkills(skillList);
    setSessions(sessionLists.flat().filter((session) => session.date >= cutoff && session.date <= todayIso()));
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, [store]);

  async function addSkill() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await store.saveSkill({ id: newId(), name: trimmed, createdAt: todayIso() });
    setName("");
    await refresh();
  }

  const knownSkills = new Map(skills.map((skill) => [skill.id, skill.name]));
  const totals = new Map<string, number>();
  for (const session of sessions) {
    const key = session.skillId ?? "unassigned";
    totals.set(key, (totals.get(key) ?? 0) + session.durationMinutes);
  }
  const totalData = Array.from(totals.entries())
    .map(([skillId, minutes]) => ({ skill: knownSkills.get(skillId) ?? "Unassigned", minutes: Number((minutes / 60).toFixed(1)) }))
    .sort((a, b) => b.minutes - a.minutes);

  const currentWeek = weekStart(new Date());
  const trendData = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const row: Record<string, string | number> = { week: `${start.getMonth() + 1}/${start.getDate()}` };
    for (const session of sessions) {
      const date = new Date(`${session.date}T00:00:00`);
      if (date >= start && date < end) {
        const key = session.skillId ?? "unassigned";
        row[key] = Number(row[key] ?? 0) + session.durationMinutes / 60;
      }
    }
    return row;
  });
  const trendSkills = Array.from(new Set(sessions.map((session) => session.skillId ?? "unassigned")));

  const skillStats = skills.map((skill) => {
    const skillSessions = sessions.filter((session) => session.skillId === skill.id);
    const minutes = skillSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    return { skill, count: skillSessions.length, average: skillSessions.length ? minutes / skillSessions.length : 0 };
  });

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">Skills</h1>
        <p className="text-xs text-ink-muted">Focus time and session patterns over the last 90 days.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Total focus" value={`${(sessions.reduce((sum, session) => sum + session.durationMinutes, 0) / 60).toFixed(1)}h`} sub="last 90d" />
        <MetricTile label="Sessions" value={String(sessions.length)} sub="last 90d" />
        <MetricTile label="Skills used" value={String(skillStats.filter((entry) => entry.count > 0).length)} sub="with sessions" />
        <MetricTile label="Avg session" value={`${sessions.length ? (sessions.reduce((sum, session) => sum + session.durationMinutes, 0) / sessions.length).toFixed(0) : 0}m`} sub="across all skills" />
      </div>

      <Card title="Hours per skill — last 90 days">
        {totalData.length === 0 ? <EmptyState message="No focus sessions yet." /> : (
          <ResponsiveContainer width="100%" height={Math.max(150, totalData.length * 34)}>
            <BarChart data={totalData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="minutes" name="Hours" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Hours per skill — last 8 weeks">
        {trendSkills.length === 0 ? <EmptyState message="No focus sessions yet." /> : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              {trendSkills.map((skillId, index) => (
                <Area key={skillId} type="monotone" dataKey={skillId} stackId="1" name={knownSkills.get(skillId) ?? "Unassigned"} stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Session count and average length">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {skillStats.map(({ skill, count, average }) => (
            <div key={skill.id} className="border border-border rounded-lg p-3">
              <div className="text-sm font-medium text-ink">{skill.name}</div>
              <div className="text-xs text-ink-muted mt-1">{count} sessions · {average.toFixed(0)}m average</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Skills">
        <div className="space-y-2">
          {skills.map((skill) => <div key={skill.id} className="text-sm text-ink">{skill.name}</div>)}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New skill name" onKeyDown={(event) => event.key === "Enter" && void addSkill()} className="flex-1" />
            <Button onClick={() => void addSkill()}><Plus size={14} /> Save</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
