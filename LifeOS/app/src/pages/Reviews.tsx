import { useEffect, useState } from "react";
import { useDataStore } from "../services/datastore/context";
import { todayIso } from "../services/id";
import type { Review } from "../services/validation/schemas";
import { weekKeyOf, weeklySummary, daysAgoIso } from "../services/analytics/analytics";
import { Card, Button, Textarea, Select } from "../components/ui";

const EMPTY_REVIEW = (period: string, startDate: string, endDate: string): Review => ({
  period,
  startDate,
  endDate,
  wentWell: "",
  wentBadly: "",
  learned: "",
  change: "",
  nextPriorities: "",
});

function currentWeekPeriod() {
  const today = todayIso();
  return { period: weekKeyOf(today), start: daysAgoIso(6), end: today };
}

function currentMonthPeriod() {
  const today = todayIso();
  return { period: today.slice(0, 7), start: today.slice(0, 8) + "01", end: today };
}

export function ReviewsPage() {
  const store = useDataStore();
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const [review, setReview] = useState<Review | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof weeklySummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const { period, start, end } = mode === "weekly" ? currentWeekPeriod() : currentMonthPeriod();
    Promise.all([store.getReview(period), store.listDailyLogs(start, end)]).then(([existing, logs]) => {
      setReview(existing ?? EMPTY_REVIEW(period, start, end));
      setSummary(weeklySummary(logs));
      setLoading(false);
    });
  }, [store, mode]);

  async function save() {
    if (!review) return;
    await store.saveReview(review);
    setSavedAt(new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }));
  }

  if (loading || !review || !summary) return <div className="p-8 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Reviews</h1>
        <Select
          value={mode}
          onChange={(v) => setMode(v as "weekly" | "monthly")}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
      </div>

      <Card title={`Auto-summary — ${review.startDate} to ${review.endDate}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-ink-faint text-xs">Avg sleep</div>
            <div className="text-ink font-medium">{summary.avgSleep ?? "—"}h</div>
          </div>
          <div>
            <div className="text-ink-faint text-xs">Avg energy</div>
            <div className="text-ink font-medium">{summary.avgEnergy ?? "—"}</div>
          </div>
          <div>
            <div className="text-ink-faint text-xs">Avg mood</div>
            <div className="text-ink font-medium">{summary.avgMood ?? "—"}</div>
          </div>
          <div>
            <div className="text-ink-faint text-xs">Avg productivity</div>
            <div className="text-ink font-medium">{summary.avgProductivity ?? "—"}</div>
          </div>
        </div>
        <p className="text-xs text-ink-faint mt-3">{summary.daysLogged} days logged in this period.</p>
      </Card>

      <Card title="Reflection">
        <div className="space-y-3">
          {(
            [
              ["wentWell", "What went well?"],
              ["wentBadly", "What went badly?"],
              ["learned", "What did I learn?"],
              ["change", "What should change?"],
              ["nextPriorities", "Next priorities"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-ink-muted mb-1">{label}</label>
              <Textarea
                value={review[key]}
                onChange={(e) => setReview({ ...review, [key]: e.target.value })}
                rows={2}
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button onClick={save}>Save review</Button>
            {savedAt && <span className="text-[11px] text-ink-faint">Saved {savedAt}</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
