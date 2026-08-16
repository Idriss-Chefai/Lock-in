import { useEffect, useState, type CSSProperties } from "react";
import { List } from "react-window";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { Task, Project } from "../services/validation/schemas";
import { Card, Button, Input, Select, Badge, EmptyState } from "../components/ui";
import { Plus, Trash2, Check } from "lucide-react";

export function TasksPage() {
  const store = useDataStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [filter, setFilter] = useState<"active" | "done" | "all">("active");

  async function refresh() {
    const [t, p] = await Promise.all([store.getTasks(), store.getProjects()]);
    setTasks(t);
    setProjects(p);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [store]);

  async function addTask() {
    if (!title.trim()) return;
    await store.saveTask({
      id: newId(),
      title: title.trim(),
      priority,
      projectId: projectId || undefined,
      status: "todo",
      tags: [],
      createdAt: todayIso(),
    });
    setTitle("");
    refresh();
  }

  async function updateStatus(task: Task, status: Task["status"]) {
    await store.saveTask({ ...task, status });
    refresh();
  }

  async function removeTask(id: string) {
    await store.deleteTask(id);
    refresh();
  }

  const visible = tasks.filter((t) => {
    if (filter === "active") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  if (loading) return <div className="p-8 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl space-y-5">
      <h1 className="text-xl font-semibold text-ink">Tasks</h1>

      <Card title="New task">
        <div className="flex gap-2 flex-wrap items-center">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="flex-1 min-w-[200px]" onKeyDown={(e) => e.key === "Enter" && addTask()} />
          <Select
            value={priority}
            onChange={(v) => setPriority(v as Task["priority"])}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <Select
            value={projectId}
            onChange={setProjectId}
            options={[{ value: "", label: "No project" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <Button onClick={addTask}>
            <Plus size={14} />
          </Button>
        </div>
      </Card>

      <div className="flex gap-1.5">
        {(["active", "done", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
              filter === f ? "bg-accent-muted text-accent" : "text-ink-muted hover:bg-surface-raised"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState message="Nothing here." />
      ) : (
        <List<{}>
          style={{ height: 600, width: "100%" }}
          rowCount={visible.length}
          rowHeight={56}
          rowProps={{} as Record<string, never>}
          rowComponent={({ index, style }: { index: number; style: CSSProperties }) => {
            const t = visible[index];
            const project = projects.find((p) => p.id === t.projectId);
            return (
              <div style={style} className="pr-2">
                <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3 group h-full">
                  <button
                    onClick={() => updateStatus(t, t.status === "done" ? "todo" : "done")}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      t.status === "done" ? "bg-accent border-accent" : "border-border"
                    }`}
                  >
                    {t.status === "done" && <Check size={11} className="text-white" />}
                  </button>
                  <span className={`flex-1 text-sm ${t.status === "done" ? "line-through text-ink-faint" : "text-ink"}`}>{t.title}</span>
                  {project && <Badge>{project.name}</Badge>}
                  <Badge tone={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "neutral"}>{t.priority}</Badge>
                  <Badge tone={t.status === "done" ? "accent" : t.status === "blocked" ? "danger" : "neutral"}>
                    {t.status === "todo" ? "todo" : t.status === "in_progress" ? "in progress" : t.status === "blocked" ? "blocked" : "done"}
                  </Badge>
                  <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
