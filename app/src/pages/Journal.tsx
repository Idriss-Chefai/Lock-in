import { useEffect, useState, type CSSProperties } from "react";
import { List } from "react-window";
import { Link } from "react-router-dom";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDataStore } from "../services/datastore/context";
import { daysAgoIso, weekKeyOf } from "../services/analytics/analytics";
import { wordFrequency } from "../services/analytics/wordFrequency";
import { todayIso } from "../services/id";
import type { DailyLog } from "../services/validation/schemas";
import { Card, EmptyState, Badge } from "../components/ui";
import { BookOpen } from "lucide-react";

interface JournalEntry {
  date: string;
  kind: "note" | "review";
  text: string;
  period?: string;
}

export function JournalPage() {
  const store = useDataStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const logs = await store.listDailyLogs(daysAgoIso(365), todayIso());
      const noteEntries: JournalEntry[] = logs
        .filter((l: DailyLog) => l.notes && l.notes.trim().length > 0)
        .map((l) => ({ date: l.date, kind: "note" as const, text: l.notes }));

      const reviewEntries: JournalEntry[] = [];
      const seenPeriods = new Set<string>();
      for (const log of logs) {
        const monthPeriod = log.date.slice(0, 7);
        const weekPeriod = weekKeyOf(log.date);
        for (const period of [monthPeriod, weekPeriod]) {
          if (seenPeriods.has(period)) continue;
          seenPeriods.add(period);
          const review = await store.getReview(period);
          if (
            review &&
            (review.wentWell || review.wentBadly || review.learned || review.change || review.nextPriorities)
          ) {
            reviewEntries.push({
              date: review.endDate,
              kind: "review" as const,
              period,
              text: [review.wentWell, review.wentBadly, review.learned, review.change, review.nextPriorities]
                .filter(Boolean)
                .join(" · "),
            });
          }
        }
      }

      const all = [...noteEntries, ...reviewEntries].sort((a, b) => b.date.localeCompare(a.date));
      setEntries(all);
      setLogs(logs);
      setLoading(false);
    }
    load();
  }, [store]);

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  const scatterData = logs
    .filter((log) => log.mood !== undefined && log.sleep?.hours !== undefined)
    .map((log) => ({ x: log.sleep?.hours ?? 0, y: log.mood ?? 0, date: log.date }));
  const topWords = wordFrequency(logs.map((log) => log.notes).filter(Boolean), 12);

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Journal</h1>
        <p className="text-xs text-ink-muted">Daily notes and reviews, in one place.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {entries.length === 0 ? (
            <EmptyState message="Nothing written yet. Notes from Today and reviews from Reviews will show up here." />
          ) : (
            <List<{ }>
              style={{ height: 600, width: "100%" }}
              rowCount={entries.length}
              rowHeight={110}
              rowProps={{} as Record<string, never>}
              rowComponent={({ index, style }: { index: number; style: CSSProperties }) => {
                const e = entries[index];
                return (
                  <div style={style} className="pr-2">
                    <Card>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-ink-faint">{e.date}</span>
                        {e.kind === "review" ? (
                          <Badge tone="accent">review · {e.period}</Badge>
                        ) : (
                          <Badge>daily note</Badge>
                        )}
                        {e.kind === "note" && (
                          <Link to={`/day/${e.date}`} className="text-xs text-accent hover:underline ml-auto">
                            Open day →
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-ink line-clamp-2">{e.text}</p>
                    </Card>
                  </div>
                );
              }}
            />
          )}

          <Link to="/reviews" className="flex items-center gap-2 text-sm text-accent hover:underline mt-3 inline-flex">
            <BookOpen size={14} /> Write a new review
          </Link>
        </div>

        <div className="space-y-4">
          <Card title="Mood vs sleep">
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 12, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" name="sleep" unit="h" tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="mood" domain={[1, 10]} tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value: number) => value} labelFormatter={(label, payload) => payload[0]?.payload?.date ?? label} />
                <Scatter data={scatterData} fill="var(--accent)" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Word cloud">
            <div className="flex flex-wrap items-end gap-2">
              {topWords.map((entry) => (
                <span
                  key={entry.word}
                  className="text-ink-muted"
                  style={{ fontSize: `${Math.max(11, entry.count * 10)}px` }}
                >
                  {entry.word}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
