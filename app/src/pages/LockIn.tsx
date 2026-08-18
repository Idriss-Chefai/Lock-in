import { useEffect, useMemo, useRef, useState } from "react";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { FocusSession, Skill } from "../services/validation/schemas";
import { Card, Button, Input, EmptyState } from "../components/ui";
import { Clock3, Play, Pause, RotateCcw, Sparkles } from "lucide-react";

const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

function formatMinutes(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function LockInPage() {
  const store = useDataStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [skillNameInput, setSkillNameInput] = useState("");
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);

  const [timerMode, setTimerMode] = useState<"pomodoro" | "freeform">("pomodoro");
  const [timerKind, setTimerKind] = useState<"work" | "break">("work");
  const [isRunning, setIsRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(workMinutes * 60);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  async function refresh() {
    const [skillsList, monthSessions] = await Promise.all([
      store.getSkills(),
      store.getFocusSessions(todayIso().slice(0, 7)),
    ]);
    setSkills(skillsList);
    setSessions(monthSessions);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, [store]);

  useEffect(() => {
    if (!isRunning || sessionStartedAt === null) return;

    intervalRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, sessionStartedAt]);

  useEffect(() => {
    if (!isRunning || secondsRemaining > 0) return;
    if (timerMode === "pomodoro" && timerKind === "work") {
      void finalizePomodoroSession();
    }
  }, [secondsRemaining, isRunning, timerMode, timerKind]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) ?? null;

  const todaysSessions = useMemo(
    () => sessions.filter((session) => session.date === todayIso()).sort((a, b) => b.id.localeCompare(a.id)),
    [sessions]
  );

  const thisWeekTotals = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const startIso = cutoff.toISOString().slice(0, 10);
    const bySkill = new Map<string, number>();

    for (const session of sessions.filter((s) => s.date >= startIso && s.date <= todayIso())) {
      const current = bySkill.get(session.skillId ?? "unassigned") ?? 0;
      bySkill.set(session.skillId ?? "unassigned", current + session.durationMinutes);
    }

    return Array.from(bySkill.entries())
      .map(([skillId, minutes]) => ({
        skillId,
        label: skills.find((skill) => skill.id === skillId)?.name ?? "Unassigned",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions, skills]);

  async function refreshSessions() {
    const month = todayIso().slice(0, 7);
    const next = await store.getFocusSessions(month);
    setSessions(next);
  }

  async function saveNewSkill() {
    const name = skillNameInput.trim();
    if (!name) return;
    const skill: Skill = { id: newId(), name, createdAt: todayIso() };
    await store.saveSkill(skill);
    setSkillNameInput("");
    setSelectedSkillId(skill.id);
    await refresh();
  }

  function setTimerSecondsForKind(nextKind: "work" | "break") {
    const minutes = nextKind === "work" ? workMinutes : breakMinutes;
    setTimerKind(nextKind);
    setSecondsRemaining(minutes * 60);
    setSessionStartedAt(null);
    setIsRunning(false);
  }

  function handleModeChange(next: "pomodoro" | "freeform") {
    setTimerMode(next);
    setIsRunning(false);
    setSessionStartedAt(null);
    setSecondsRemaining(next === "pomodoro" ? workMinutes * 60 : 0);
  }

  function startFreeform() {
    setTimerMode("freeform");
    setTimerKind("work");
    setSessionStartedAt(Date.now());
    setSecondsRemaining(0);
    setIsRunning(true);
  }

  async function finalizePomodoroSession() {
    if (sessionStartedAt === null || selectedSkillId === "") return;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 60000));
    const session: FocusSession = {
      id: newId(),
      date: todayIso(),
      skillId: selectedSkillId || undefined,
      mode: "pomodoro",
      durationMinutes: elapsedMinutes,
      startedAt: new Date(sessionStartedAt).toISOString(),
    };
    await store.saveFocusSession(todayIso().slice(0, 7), session);
    await refreshSessions();
    setTimerKind("work");
    setSecondsRemaining(workMinutes * 60);
    setSessionStartedAt(null);
    setIsRunning(false);
  }

  async function stopCurrentSession(savePartial = true) {
    if (!isRunning || sessionStartedAt === null) {
      setIsRunning(false);
      setSessionStartedAt(null);
      if (timerMode === "pomodoro") {
        setSecondsRemaining(workMinutes * 60);
      }
      return;
    }

    if (timerMode === "freeform") {
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 60000));
      await store.saveFocusSession(todayIso().slice(0, 7), {
        id: newId(),
        date: todayIso(),
        skillId: selectedSkillId || undefined,
        mode: "freeform",
        durationMinutes: elapsedMinutes,
        startedAt: new Date(sessionStartedAt).toISOString(),
      });
      await refreshSessions();
      setIsRunning(false);
      setSessionStartedAt(null);
      setSecondsRemaining(0);
      return;
    }

    if (timerMode === "pomodoro" && timerKind === "work" && savePartial) {
      await finalizePomodoroSession();
      return;
    }

    setIsRunning(false);
    setSessionStartedAt(null);
    setSecondsRemaining(workMinutes * 60);
  }

  async function toggleRun() {
    if (timerMode === "freeform") {
      if (isRunning) {
        await stopCurrentSession(true);
        return;
      }
      startFreeform();
      return;
    }

    if (isRunning) {
      await stopCurrentSession(true);
      return;
    }

    setIsRunning(true);
    setSessionStartedAt(Date.now());
    setSecondsRemaining(secondsRemaining > 0 ? secondsRemaining : workMinutes * 60);
  }

  if (loading) return <div className="p-8 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Lock In</h1>
          <p className="text-xs text-ink-muted">Focus sessions and skill time tracking.</p>
        </div>
      </div>

      <Card title="Focus session">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={timerMode}
              onChange={(e) => handleModeChange(e.target.value as "pomodoro" | "freeform")}
              className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-sm text-ink"
            >
              <option value="pomodoro">Pomodoro</option>
              <option value="freeform">Freeform</option>
            </select>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={1}
                max={180}
                value={workMinutes}
                onChange={(e) => setWorkMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="w-20"
              />
              <span className="text-xs text-ink-faint">work</span>
              <Input
                type="number"
                min={1}
                max={180}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="w-20"
              />
              <span className="text-xs text-ink-faint">break</span>
            </div>
          </div>

          {timerMode === "pomodoro" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimerSecondsForKind("work")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${timerKind === "work" ? "bg-accent-muted text-accent" : "bg-surface-raised text-ink-muted"}`}
              >
                Work
              </button>
              <button
                onClick={() => setTimerSecondsForKind("break")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${timerKind === "break" ? "bg-accent-muted text-accent" : "bg-surface-raised text-ink-muted"}`}
              >
                Break
              </button>
            </div>
          )}

          <div className="flex items-center justify-center py-5">
            <div className="rounded-full border border-border bg-surface-raised w-52 h-52 flex items-center justify-center flex-col">
              <Clock3 size={22} className="text-ink-faint mb-2" />
              <span className="text-3xl font-semibold text-ink">
                {timerMode === "pomodoro"
                  ? `${Math.floor(secondsRemaining / 60).toString().padStart(2, "0")}:${(secondsRemaining % 60).toString().padStart(2, "0")}`
                  : `${Math.floor((Date.now() - (sessionStartedAt ?? Date.now())) / 60000)}m`}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-ink-faint mt-1">
                {timerMode === "pomodoro" ? (timerKind === "work" ? "Work" : "Break") : "Live"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={() => void toggleRun()}>
              {isRunning ? <Pause size={14} /> : <Play size={14} />}
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button variant="secondary" onClick={() => void stopCurrentSession(false)}>
              <RotateCcw size={14} /> Reset
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              list="skill-options"
              value={selectedSkill ? selectedSkill.name : skillNameInput}
              onChange={(e) => {
                const value = e.target.value;
                setSkillNameInput(value);
                const match = skills.find((skill) => skill.name.toLowerCase() === value.toLowerCase());
                setSelectedSkillId(match?.id ?? "");
              }}
              placeholder="Skill or project focus"
              className="flex-1 min-w-[180px]"
            />
            <datalist id="skill-options">
              {skills.map((skill) => (
                <option key={skill.id} value={skill.name} />
              ))}
            </datalist>
            <Button variant="secondary" onClick={() => void saveNewSkill()}>
              <Sparkles size={14} /> Add skill
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Today">
          {todaysSessions.length === 0 ? (
            <EmptyState message="No focus sessions logged yet today." />
          ) : (
            <div className="space-y-2">
              {todaysSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="text-ink font-medium">{skills.find((skill) => skill.id === session.skillId)?.name ?? "Unassigned"}</div>
                    <div className="text-[11px] text-ink-faint uppercase">{session.mode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-ink font-medium">{formatMinutes(session.durationMinutes)}</div>
                    <div className="text-[11px] text-ink-faint">{session.startedAt ? new Date(session.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : session.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="This week by skill">
          {thisWeekTotals.length === 0 ? (
            <EmptyState message="No focus minutes yet this week." />
          ) : (
            <div className="space-y-3">
              {thisWeekTotals.map((entry) => (
                <div key={entry.skillId}>
                  <div className="flex items-center justify-between text-xs text-ink-faint mb-1">
                    <span>{entry.label}</span>
                    <span>{(entry.minutes / 60).toFixed(1)}h</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, (entry.minutes / Math.max(1, thisWeekTotals[0].minutes)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
