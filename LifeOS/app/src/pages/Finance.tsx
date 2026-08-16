import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { Transaction, Settings } from "../services/validation/schemas";
import { Card, Button, Input, Select, Badge, EmptyState } from "../components/ui";
import { Plus, Trash2 } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "TND", "JPY", "CAD"];
const AREA_COLORS = ["var(--accent)", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function FinancePage() {
  const store = useDataStore();
  const [month, setMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trendData, setTrendData] = useState<Record<string, number | string>[]>([]);
  const [trendCategories, setTrendCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [type, setType] = useState<Transaction["type"]>("expense");
  const [knownCategories, setKnownCategories] = useState<string[]>([]);

  async function refresh() {
    const [tx, cats, settings] = await Promise.all([
      store.getTransactions(month),
      store.getFinanceCategories(),
      store.getSettings(),
    ]);
    setTransactions(tx);
    setKnownCategories(cats);
    setCurrency(settings.currency);

    // Build a 6-month stacked-area trend of spending by category.
    const months = lastNMonths(6);
    const allCats = new Set<string>();
    const perMonth: Record<string, number>[] = [];
    for (const m of months) {
      const monthTx = m === month ? tx : await store.getTransactions(m);
      const row: Record<string, number> = { month: Number(m.slice(5)) };
      for (const t of monthTx.filter((t) => t.type === "expense")) {
        row[t.category] = (row[t.category] ?? 0) + t.amount;
        allCats.add(t.category);
      }
      perMonth.push({ ...row, __label: m } as any);
    }
    setTrendData(perMonth.map((r, i) => ({ ...r, monthLabel: months[i].slice(5) })));
    setTrendCategories(Array.from(allCats));
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [store, month]);

  async function addTransaction() {
    const amt = parseFloat(amount);
    const cat = category.trim() || "General";
    if (!desc.trim() || Number.isNaN(amt)) return;
    await store.saveTransaction(month, {
      id: newId(),
      date: todayIso(),
      description: desc.trim(),
      amount: Math.abs(amt),
      currency,
      category: cat,
      type,
    });
    await store.addFinanceCategory(cat);
    setDesc("");
    setAmount("");
    setCategory("");
    refresh();
  }

  async function removeTransaction(id: string) {
    await store.deleteTransaction(month, id);
    refresh();
  }

  async function setDefaultCurrency(c: string) {
    setCurrency(c);
    const settings = await store.getSettings();
    await store.saveSettings({ ...settings, currency: c } as Settings);
  }

  // Totals only sum transactions sharing the currently-selected default
  // currency — mixing currencies in one sum would silently misrepresent
  // your spending, so transactions in other currencies are shown but
  // excluded from totals, flagged below.
  const sameCurrency = transactions.filter((t) => t.currency === currency);
  const otherCurrencyCount = transactions.length - sameCurrency.length;
  const income = sameCurrency.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = sameCurrency.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;

  const byCategory = new Map<string, number>();
  for (const t of sameCurrency.filter((t) => t.type === "expense")) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const categoryData = Array.from(byCategory.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Finance</h1>
        <div className="flex items-center gap-2">
          <Select value={currency} onChange={setDefaultCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        </div>
      </div>

      {otherCurrencyCount > 0 && (
        <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          {otherCurrencyCount} transaction{otherCurrencyCount === 1 ? "" : "s"} this month use a different
          currency and are excluded from the totals below (shown in the list, not converted).
        </p>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card title="Income">
          <p className="text-2xl font-semibold text-success">
            {currency} {income.toFixed(2)}
          </p>
        </Card>
        <Card title="Expenses">
          <p className="text-2xl font-semibold text-danger">
            {currency} {expenses.toFixed(2)}
          </p>
        </Card>
        <Card title="Net">
          <p className={`text-2xl font-semibold ${net >= 0 ? "text-ink" : "text-danger"}`}>
            {currency} {net.toFixed(2)}
          </p>
        </Card>
      </div>

      <Card title="Spending by category — last 6 months">
        {trendCategories.length === 0 ? (
          <EmptyState message="No spending data yet." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {trendCategories.map((cat, i) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stackId="1"
                  stroke={AREA_COLORS[i % AREA_COLORS.length]}
                  fill={AREA_COLORS[i % AREA_COLORS.length]}
                  fillOpacity={0.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {categoryData.length > 0 && (
        <Card title={`This month by category (${month})`}>
          <ResponsiveContainer width="100%" height={Math.max(120, categoryData.length * 32)}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="amount" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {knownCategories.length > 0 && (
        <Card title="Categories">
          <div className="flex flex-wrap gap-1.5">
            {knownCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  category === c ? "bg-accent text-white" : "bg-surface-raised text-ink-muted hover:bg-surface-sunken"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card title="Add transaction">
        <div className="flex gap-2 flex-wrap items-center">
          <Select
            value={type}
            onChange={(v) => setType(v as Transaction["type"])}
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description"
            className="flex-1 min-w-[140px]"
            onKeyDown={(e) => e.key === "Enter" && addTransaction()}
          />
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step={0.01}
            placeholder="Amount"
            className="w-24"
          />
          <Select value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          <div className="relative">
            <Input
              list="finance-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="w-36"
            />
            <datalist id="finance-categories">
              {knownCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          {category.trim() && !knownCategories.some((c) => c.toLowerCase() === category.trim().toLowerCase()) && (
            <Badge tone="accent">new category</Badge>
          )}
          <Button onClick={addTransaction}>
            <Plus size={14} />
          </Button>
        </div>
      </Card>

      <Card title={`Transactions — ${month}`}>
        {transactions.length === 0 ? (
          <EmptyState message="No transactions this month." />
        ) : (
          <ul className="space-y-1.5">
            {transactions
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((t) => (
                <li key={t.id} className="flex items-center gap-3 text-sm group">
                  <span className="text-ink-faint w-20 shrink-0">{t.date}</span>
                  <span className="flex-1 text-ink">{t.description}</span>
                  <Badge>{t.category}</Badge>
                  <span className={`font-medium w-24 text-right ${t.type === "income" ? "text-success" : "text-ink"}`}>
                    {t.type === "income" ? "+" : "-"}
                    {t.currency} {t.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeTransaction(t.id)}
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
