export interface HeatmapGridProps {
  data: { date: string; value: number }[];
  weeks?: number;
}

function clampAlpha(value: number): number {
  const ratio = Math.max(0, Math.min(1, value));
  if (ratio === 0) return 0.08;
  if (ratio < 0.25) return 0.2;
  if (ratio < 0.5) return 0.35;
  if (ratio < 0.75) return 0.55;
  return 0.8;
}

export function HeatmapGrid({ data, weeks = 52 }: HeatmapGridProps) {
  const map = new Map(data.map((entry) => [entry.date, entry.value]));
  const cells: { date: string; value: number }[] = [];
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (weeks * 7 - 1));

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    cells.push({ date: iso, value: map.get(iso) ?? 0 });
  }

  const rows = Array.from({ length: 7 }, (_, row) =>
    cells.slice(row * weeks, row * weeks + weeks)
  );

  return (
    <div className="space-y-1.5">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {rows[0]?.map((_, index) => (
          <div key={`label-${index}`} className="text-[10px] text-ink-faint text-center">{index + 1}</div>
        ))}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {rows.flat().map((cell) => {
          const alpha = clampAlpha(cell.value);
          return (
            <div
              key={cell.date}
              title={`${cell.date}: ${cell.value}`}
              className="h-2.5 rounded-[3px] border border-border/40"
              style={{
                backgroundColor: cell.value > 0 ? `rgba(139, 92, 246, ${alpha})` : "rgba(148, 163, 184, 0.08)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
