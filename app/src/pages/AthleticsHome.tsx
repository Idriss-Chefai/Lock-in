import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDataStore } from "../services/datastore/context";
import { daysAgoIso } from "../services/analytics/analytics";
import { todayIso } from "../services/id";
import type { TrainingSession, NutritionEntry, WeightEntry } from "../services/validation/schemas";
import { Card } from "../components/ui";

export function AthleticsHomePage() {
  const store = useDataStore();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [nutrition, setNutrition] = useState<NutritionEntry[]>([]);
  const [weight, setWeight] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([store.getTrainingSessions(), store.getNutritionEntries(), store.getWeightEntries()]).then(
      ([s, n, w]) => {
        setSessions(s);
        setNutrition(n);
        setWeight(w);
        setLoading(false);
      }
    );
  }, [store]);

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  const sessionsLast30 = sessions.filter((s) => s.date >= daysAgoIso(29));
  const todayCalories = nutrition
    .filter((n) => n.date === todayIso())
    .reduce((s, n) => s + (n.calories ?? 0), 0);
  const latestWeight = [...weight].sort((a, b) => b.date.localeCompare(a.date))[0];

  const sessionTrend = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const iso = date.toISOString().slice(0, 10);
    return {
      date: iso.slice(5),
      sessions: sessions.filter((s) => s.date === iso).length,
    };
  });

  const nutritionTrend = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const iso = date.toISOString().slice(0, 10);
    const total = nutrition.filter((entry) => entry.date === iso).reduce((sum, entry) => sum + (entry.calories ?? 0), 0);
    return { date: iso.slice(5), calories: total };
  });

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Athletics</h1>
        <p className="text-xs text-ink-muted">Training and nutrition, side by side.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Health overview">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-xs text-ink-faint">Sessions (30d)</p>
              <p className="text-2xl font-semibold text-ink">{sessionsLast30.length}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Latest weight</p>
              <p className="text-2xl font-semibold text-ink">{latestWeight ? `${latestWeight.kg} kg` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Avg. per week</p>
              <p className="text-2xl font-semibold text-ink">{Math.round((sessionsLast30.length / 4.3) * 10) / 10}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sessionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.ceil(sessionTrend.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 10 }} width={24} allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} session${value === 1 ? "" : "s"}`, "Training"]} />
              <Bar dataKey="sessions" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Brush dataKey="date" height={18} stroke="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Nutrition overview">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-xs text-ink-faint">Calories today</p>
              <p className="text-2xl font-semibold text-ink">{Math.round(todayCalories) || "—"} kcal</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Avg. / day</p>
              <p className="text-2xl font-semibold text-ink">{Math.round(nutritionTrend.reduce((sum, d) => sum + d.calories, 0) / nutritionTrend.length) || 0} kcal</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Meal entries</p>
              <p className="text-2xl font-semibold text-ink">{nutrition.length}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={nutritionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.ceil(nutritionTrend.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip formatter={(value) => [`${value} kcal`, "Calories"]} />
              <Line type="monotone" dataKey="calories" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Brush dataKey="date" height={18} stroke="var(--accent)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="flex gap-4 text-sm">
        <Link to="/health" className="text-accent hover:underline">Health →</Link>
        <Link to="/nutrition" className="text-accent hover:underline">Nutrition →</Link>
      </div>
    </div>
  );
}
