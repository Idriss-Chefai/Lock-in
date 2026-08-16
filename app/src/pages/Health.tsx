import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { TrainingSession, Exercise, ExerciseSet } from "../services/validation/schemas";
import type { WeightEntry } from "../services/datastore/DataStore";
import { Card, Button, Input, Select, EmptyState, Badge } from "../components/ui";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Mobility" },
  { value: "other", label: "Other" },
];

const METRIC_OPTIONS = [
  { value: "weight", label: "Weight" },
  { value: "reps", label: "Reps" },
  { value: "duration", label: "Duration" },
  { value: "distance", label: "Distance" },
];

export function HealthPage() {
  const store = useDataStore();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [weight, setWeight] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [wDate, setWDate] = useState(todayIso());
  const [wKg, setWKg] = useState("");

  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exName, setExName] = useState("");
  const [exCategory, setExCategory] = useState<Exercise["category"]>("strength");
  const [exMetric, setExMetric] = useState<Exercise["primaryMetric"]>("weight");

  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(todayIso());
  const [logWeight, setLogWeight] = useState("");
  const [logReps, setLogReps] = useState("");
  const [logDuration, setLogDuration] = useState("");
  const [logDistance, setLogDistance] = useState("");

  async function refresh() {
    const [s, e, w] = await Promise.all([
      store.getTrainingSessions(),
      store.getExercises(),
      store.getWeightEntries(),
    ]);
    setSessions(s);
    setExercises(e);
    setWeight(w.sort((a, b) => a.date.localeCompare(b.date)));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [store]);

  async function addWeight() {
    const kg = Number(wKg);
    if (!wDate || Number.isNaN(kg) || kg <= 0) return;
    await store.saveWeightEntry({ date: wDate, kg });
    setWKg("");
    refresh();
  }

  async function addExercise() {
    if (!exName.trim()) return;
    await store.saveExercise({
      id: newId(),
      name: exName.trim(),
      category: exCategory,
      primaryMetric: exMetric,
    });
    setExName("");
    setShowExerciseForm(false);
    refresh();
  }

  async function removeExercise(id: string) {
    await store.deleteExercise(id);
    refresh();
  }

  async function logSet(exercise: Exercise) {
    const set: ExerciseSet = {
      exerciseId: exercise.id,
      weightKg: logWeight ? Number(logWeight) : undefined,
      reps: logReps ? Number(logReps) : undefined,
      durationMinutes: logDuration ? Number(logDuration) : undefined,
      distanceKm: logDistance ? Number(logDistance) : undefined,
    };
    if (
      set.weightKg === undefined &&
      set.reps === undefined &&
      set.durationMinutes === undefined &&
      set.distanceKm === undefined
    )
      return;

    // Group sets logged the same day + exercise type into one session, so
    // the workout log reads as "one session per day" rather than exploding
    // into a session-per-set.
    const existing = sessions.find((s) => s.date === logDate && s.type === exercise.name);
    if (existing) {
      await store.saveTrainingSession({ ...existing, sets: [...existing.sets, set] });
    } else {
      await store.saveTrainingSession({
        id: newId(),
        date: logDate,
        type: exercise.name,
        sets: [set],
      });
    }
    setLogWeight("");
    setLogReps("");
    setLogDuration("");
    setLogDistance("");
    refresh();
  }

  async function removeSession(id: string) {
    await store.deleteTrainingSession(id);
    refresh();
  }

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold text-ink">Health</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Weight trend">
          {weight.length < 2 ? (
            <EmptyState message="Log a couple of weight entries to see a trend." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weight}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} hide />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={36} />
                <Tooltip />
                <Line type="monotone" dataKey="kg" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-2 mt-3">
            <Input type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} className="w-40" />
            <Input
              type="number"
              step={0.1}
              value={wKg}
              onChange={(e) => setWKg(e.target.value)}
              placeholder="kg"
              className="w-24"
            />
            <Button onClick={addWeight}>
              <Plus size={14} />
            </Button>
          </div>
        </Card>

        <Card title="Training frequency">
          <p className="text-3xl font-semibold text-ink">
            {sessions.filter((s) => s.date >= daysAgo(30)).length}
          </p>
          <p className="text-sm text-ink-faint">sessions in the last 30 days</p>
        </Card>
      </div>

      <Card
        title="Exercises"
        action={
          <Button variant="secondary" onClick={() => setShowExerciseForm((s) => !s)}>
            <Plus size={13} /> Add exercise
          </Button>
        }
      >
        {showExerciseForm && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <Input
              value={exName}
              onChange={(e) => setExName(e.target.value)}
              placeholder="Exercise name (e.g. Bench Press)"
              className="flex-1 min-w-[160px]"
            />
            <Select value={exCategory} onChange={(v) => setExCategory(v as Exercise["category"])} options={CATEGORY_OPTIONS} />
            <Select value={exMetric} onChange={(v) => setExMetric(v as Exercise["primaryMetric"])} options={METRIC_OPTIONS} />
            <Button onClick={addExercise}>Save</Button>
          </div>
        )}

        {exercises.length === 0 ? (
          <EmptyState message="No exercises yet — add one to start logging sets." />
        ) : (
          <div className="space-y-2">
            {exercises.map((ex) => {
              const isOpen = expandedExerciseId === ex.id;
              const exerciseSets = sessions
                .filter((s) => s.type === ex.name)
                .flatMap((s) => s.sets.map((set) => ({ ...set, date: s.date, sessionId: s.id })));

              return (
                <div key={ex.id} className="border border-border rounded-lg">
                  <button
                    onClick={() => setExpandedExerciseId(isOpen ? null : ex.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="text-sm font-medium text-ink flex-1">{ex.name}</span>
                    <Badge>{ex.category}</Badge>
                    <span className="text-xs text-ink-faint">{exerciseSets.length} sets logged</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExercise(ex.id);
                      }}
                      className="text-ink-faint hover:text-danger p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* Log a set */}
                      <div className="flex gap-2 items-center flex-wrap bg-surface-raised rounded-lg p-2">
                        <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="w-36" />
                        <Input
                          type="number"
                          placeholder="kg"
                          value={logWeight}
                          onChange={(e) => setLogWeight(e.target.value)}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          placeholder="reps"
                          value={logReps}
                          onChange={(e) => setLogReps(e.target.value)}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          placeholder="minutes"
                          value={logDuration}
                          onChange={(e) => setLogDuration(e.target.value)}
                          className="w-24"
                        />
                        <Input
                          type="number"
                          step={0.1}
                          placeholder="km"
                          value={logDistance}
                          onChange={(e) => setLogDistance(e.target.value)}
                          className="w-20"
                        />
                        <Button onClick={() => logSet(ex)}>
                          <Plus size={13} /> Log set
                        </Button>
                      </div>

                      {/* Trend charts: weight, reps, duration, distance over time */}
                      {exerciseSets.length === 0 ? (
                        <EmptyState message="No sets logged for this exercise yet." />
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <ExerciseMetricChart data={exerciseSets} metric="weightKg" label="Weight (kg)" color="#8b5cf6" />
                          <ExerciseMetricChart data={exerciseSets} metric="reps" label="Reps" color="#f59e0b" />
                          <ExerciseMetricChart
                            data={exerciseSets}
                            metric="durationMinutes"
                            label="Duration (min)"
                            color="var(--accent)"
                          />
                          <ExerciseMetricChart data={exerciseSets} metric="distanceKm" label="Distance (km)" color="#22c55e" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Recent sessions">
        {sessions.length === 0 ? (
          <EmptyState message="No training sessions logged yet." />
        ) : (
          <ul className="space-y-1.5">
            {sessions
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15)
              .map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm group">
                  <span className="text-ink-faint w-24 shrink-0">{s.date}</span>
                  <span className="flex-1 text-ink">{s.type}</span>
                  <span className="text-ink-muted text-xs">{s.sets.length} sets</span>
                  <button
                    onClick={() => removeSession(s.id)}
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

function ExerciseMetricChart({
  data,
  metric,
  label,
  color,
}: {
  data: (ExerciseSet & { date: string })[];
  metric: "weightKg" | "reps" | "durationMinutes" | "distanceKm";
  label: string;
  color: string;
}) {
  const points = data
    .filter((d) => d[metric] !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date.slice(5), value: d[metric] }));

  if (points.length === 0) {
    return (
      <div>
        <p className="text-xs text-ink-muted mb-1">{label}</p>
        <p className="text-xs text-ink-faint">No data</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={points}>
          <XAxis dataKey="date" tick={{ fontSize: 9 }} hide />
          <YAxis tick={{ fontSize: 9 }} width={24} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
