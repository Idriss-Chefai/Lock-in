import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import { daysAgoIso } from "../services/analytics/analytics";
import type { NutritionEntry } from "../services/validation/schemas";
import { Card, Button, Input, EmptyState } from "../components/ui";
import { Plus, Trash2 } from "lucide-react";

const MACRO_COLORS = { protein: "#22c55e", carbs: "#f59e0b", fat: "#ec4899" };

export function NutritionPage() {
  const store = useDataStore();
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(todayIso());
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  async function refresh() {
    const e = await store.getNutritionEntries();
    setEntries(e.sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [store]);

  async function addEntry() {
    if (!mealName.trim()) return;
    await store.saveNutritionEntry({
      id: newId(),
      date,
      mealName: mealName.trim(),
      calories: calories ? Number(calories) : undefined,
      proteinG: protein ? Number(protein) : undefined,
      carbsG: carbs ? Number(carbs) : undefined,
      fatG: fat ? Number(fat) : undefined,
    });
    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    refresh();
  }

  async function removeEntry(id: string) {
    await store.deleteNutritionEntry(id);
    refresh();
  }

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  const last30 = entries.filter((e) => e.date >= daysAgoIso(29));
  const byDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  for (const e of last30) {
    const cur = byDay.get(e.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    cur.calories += e.calories ?? 0;
    cur.protein += e.proteinG ?? 0;
    cur.carbs += e.carbsG ?? 0;
    cur.fat += e.fatG ?? 0;
    byDay.set(e.date, cur);
  }
  const calorieTrend = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), calories: v.calories }));

  const todayTotals = byDay.get(todayIso()) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const macroPie = [
    { name: "Protein", value: todayTotals.protein, color: MACRO_COLORS.protein },
    { name: "Carbs", value: todayTotals.carbs, color: MACRO_COLORS.carbs },
    { name: "Fat", value: todayTotals.fat, color: MACRO_COLORS.fat },
  ].filter((m) => m.value > 0);

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <h1 className="text-lg font-semibold text-ink">Nutrition</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Calories — last 30 days">
          {calorieTrend.length < 2 ? (
            <EmptyState message="Log a few meals to see a trend." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={calorieTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip />
                <Line type="monotone" dataKey="calories" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Today's macros">
          {macroPie.length === 0 ? (
            <EmptyState message="No macros logged today yet." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={macroPie} dataKey="value" nameKey="name" innerRadius={35} outerRadius={65}>
                  {macroPie.map((m, i) => (
                    <Cell key={i} fill={m.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <p className="text-xs text-ink-faint mt-1">{Math.round(todayTotals.calories)} kcal today</p>
        </Card>
      </div>

      <Card title="Log a meal">
        <div className="flex gap-2 flex-wrap items-center">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36" />
          <Input
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="Meal (e.g. Lunch)"
            className="flex-1 min-w-[120px]"
          />
          <Input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" placeholder="kcal" className="w-20" />
          <Input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" placeholder="protein g" className="w-24" />
          <Input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" placeholder="carbs g" className="w-24" />
          <Input value={fat} onChange={(e) => setFat(e.target.value)} type="number" placeholder="fat g" className="w-20" />
          <Button onClick={addEntry}>
            <Plus size={14} />
          </Button>
        </div>
      </Card>

      <Card title="Recent meals">
        {entries.length === 0 ? (
          <EmptyState message="No meals logged yet." />
        ) : (
          <ul className="space-y-1.5">
            {entries.slice(0, 20).map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm group">
                <span className="text-ink-faint w-24 shrink-0">{e.date}</span>
                <span className="flex-1 text-ink">{e.mealName}</span>
                <span className="text-ink-muted text-xs">
                  {e.calories ?? "—"} kcal · P{e.proteinG ?? 0} C{e.carbsG ?? 0} F{e.fatG ?? 0}
                </span>
                <button
                  onClick={() => removeEntry(e.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger p-1"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
