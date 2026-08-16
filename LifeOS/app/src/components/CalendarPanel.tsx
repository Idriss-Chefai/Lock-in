import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "../services/datastore/context";
import type { DailyLog, Project, Task } from "../services/validation/schemas";
import { ChevronLeft, ChevronRight } from "lucide-react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CalendarPanel() {
  const store = useDataStore();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // month is 0-indexed
  });
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);

  useEffect(() => {
    const from = `${cursor.year}-${pad(cursor.month + 1)}-01`;
    const lastDay = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const to = `${cursor.year}-${pad(cursor.month + 1)}-${pad(lastDay)}`;
    Promise.all([
      store.listDailyLogs(from, to),
      store.getProjects(),
      store.getTasks(),
    ]).then(([logs, projects, tasks]) => {
      setLoggedDates(new Set(logs.map((l) => l.date)));
      const selected = logs.find((l) => l.date === selectedDate) ?? null;
      setSelectedLog(selected);
      setSelectedProjects(projects.filter((project) => tasks.some((task) => task.projectId === project.id && (task.dueDate === selectedDate || task.createdAt === selectedDate))));
      setSelectedTasks(tasks.filter((task) => task.dueDate === selectedDate || task.createdAt === selectedDate));
    });
  }, [store, cursor, selectedDate]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // Monday-start week
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function goToDate(day: number) {
    const dateStr = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
    setSelectedDate(dateStr);
    if (dateStr === todayStr) navigate("/today");
    else navigate(`/day/${dateStr}`);
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <aside className="w-64 shrink-0 border-l border-border bg-surface h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shiftMonth(-1)} className="text-ink-faint hover:text-ink p-1">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-ink">
          {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => shiftMonth(1)} className="text-ink-faint hover:text-ink p-1">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] text-ink-faint">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
          const isToday = dateStr === todayStr;
          const hasLog = loggedDates.has(dateStr);
          return (
            <button
              key={i}
              onClick={() => goToDate(day)}
              className={`aspect-square rounded-md text-xs flex items-center justify-center relative transition-colors ${
                isToday ? "bg-accent text-white font-medium" : "text-ink hover:bg-surface-raised"
              }`}
            >
              {day}
              {hasLog && !isToday && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border space-y-3">
        <p className="text-xs text-ink-faint">
          {loggedDates.size} day{loggedDates.size === 1 ? "" : "s"} logged this month
        </p>

        <div className="rounded-lg border border-border bg-surface-raised p-3">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint mb-2">{selectedDate}</p>
          {selectedLog ? (
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-ink-faint mb-1">Done</p>
                {selectedLog.tasks.filter((task) => task.done).length > 0 ? (
                  <ul className="space-y-1">
                    {selectedLog.tasks.filter((task) => task.done).map((task) => (
                      <li key={task.id} className="text-ink line-through">• {task.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-faint">Nothing completed.</p>
                )}
              </div>
              <div>
                <p className="text-ink-faint mb-1">To do</p>
                {selectedLog.tasks.filter((task) => !task.done).length > 0 ? (
                  <ul className="space-y-1">
                    {selectedLog.tasks.filter((task) => !task.done).map((task) => (
                      <li key={task.id} className="text-ink">• {task.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-faint">No open tasks.</p>
                )}
              </div>
              {(selectedProjects.length > 0 || selectedTasks.length > 0) && (
                <div>
                  <p className="text-ink-faint mb-1">Projects / tasks</p>
                  <div className="space-y-1">
                    {selectedProjects.map((project) => (
                      <div key={project.id} className="text-ink">• {project.name}</div>
                    ))}
                    {selectedTasks.map((task) => (
                      <div key={task.id} className="text-ink-faint">• {task.title}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No daily log for this date yet.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
