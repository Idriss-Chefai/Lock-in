import { useEffect, useState } from "react";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { Project, Task } from "../services/validation/schemas";
import { Card, Button, Input, Select, Badge, EmptyState, ProgressBar, Textarea } from "../components/ui";
import { Plus, Trash2, Check, Circle } from "lucide-react";

const STATUS_TONE: Record<Project["status"], "neutral" | "success" | "warning" | "accent"> = {
  planned: "neutral",
  active: "accent",
  paused: "warning",
  completed: "success",
  cancelled: "neutral",
};

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function ProjectsPage() {
  const store = useDataStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", targetDate: "", nextAction: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  async function refresh() {
    const [p, t] = await Promise.all([store.getProjects(), store.getTasks()]);
    setProjects(p);
    setTasks(t);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [store]);

  async function addProject() {
    if (!form.name.trim()) return;
    await store.saveProject({
      id: newId(),
      name: form.name.trim(),
      description: form.description,
      status: "planned",
      priority: "medium",
      startDate: todayIso(),
      targetDate: form.targetDate || undefined,
      progress: 0,
      hoursInvested: 0,
      nextAction: form.nextAction || undefined,
      taskIds: [],
    });
    setForm({ name: "", description: "", targetDate: "", nextAction: "" });
    setShowForm(false);
    refresh();
  }

  async function updateProject(p: Project, patch: Partial<Project>) {
    await store.saveProject({ ...p, ...patch });
    refresh();
  }

  async function removeProject(id: string) {
    await store.deleteProject(id);
    refresh();
  }

  async function toggleTaskDone(t: Task) {
    await store.saveTask({ ...t, status: t.status === "done" ? "todo" : "done" });
    refresh();
  }

  async function addTaskToProject(p: Project) {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: newId(),
      title: newTaskTitle.trim(),
      projectId: p.id,
      priority: "medium",
      status: "todo",
      tags: [],
      createdAt: todayIso(),
    };
    await store.saveTask(task);
    setNewTaskTitle("");
    refresh();
  }

  if (loading) return <div className="p-6 text-sm text-ink-faint">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Projects</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> New project
        </Button>
      </div>

      {showForm && (
        <Card title="New project">
          <div className="space-y-3">
            <Input
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full"
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Next action"
                value={form.nextAction}
                onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
                className="flex-1"
              />
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="w-40"
              />
            </div>
            <Button onClick={addProject}>Save project</Button>
          </div>
        </Card>
      )}

      {projects.length === 0 ? (
        <EmptyState message="No projects yet — what are you actually progressing?" />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const linkedTasks = tasks.filter((t) => t.projectId === p.id);
            const doneCount = linkedTasks.filter((t) => t.status === "done").length;
            // Completion is driven automatically by linked tasks once any
            // exist; manual progress only applies when nothing is linked.
            const taskDriven = linkedTasks.length > 0;
            const pct = taskDriven ? Math.round((doneCount / linkedTasks.length) * 100) : p.progress;
            const isExpanded = expanded === p.id;

            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{p.name}</span>
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    </div>
                    {p.description && <p className="text-sm text-ink-muted mt-0.5">{p.description}</p>}
                    {p.nextAction && <p className="text-xs text-ink-faint mt-1">Next: {p.nextAction}</p>}
                  </div>
                  <button onClick={() => removeProject(p.id)} className="text-ink-faint hover:text-danger p-1">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <ProgressBar value={pct} />
                  <span className="text-xs text-ink-faint w-10 text-right">{pct}%</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {taskDriven ? (
                    <span className="text-xs text-ink-faint">
                      {doneCount}/{linkedTasks.length} tasks done · driven by linked tasks
                    </span>
                  ) : (
                    <>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={p.progress}
                        onChange={(e) =>
                          updateProject(p, { progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-ink-faint">% complete (no tasks linked yet)</span>
                    </>
                  )}
                  <Select
                    value={p.status}
                    onChange={(v) => updateProject(p, { status: v as Project["status"] })}
                    options={STATUS_OPTIONS}
                    className="ml-auto"
                  />
                </div>

                <button
                  onClick={() => setExpanded(isExpanded ? null : p.id)}
                  className="text-xs text-accent hover:underline"
                >
                  {isExpanded ? "Hide tasks" : `${linkedTasks.length > 0 ? "Manage" : "Add"} tasks`}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {linkedTasks.length === 0 ? (
                      <p className="text-xs text-ink-faint">No tasks linked yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {linkedTasks.map((t) => (
                          <li key={t.id} className="flex items-center gap-2 text-sm">
                            <button onClick={() => toggleTaskDone(t)} className="text-ink-faint hover:text-accent">
                              {t.status === "done" ? (
                                <Check size={14} className="text-success" />
                              ) : (
                                <Circle size={14} />
                              )}
                            </button>
                            <span className={t.status === "done" ? "line-through text-ink-faint" : "text-ink"}>
                              {t.title}
                            </span>
                            {t.dueDate && (
                              <span className="text-xs text-ink-faint ml-auto">due {t.dueDate}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="New task for this project"
                        className="flex-1"
                        onKeyDown={(e) => e.key === "Enter" && addTaskToProject(p)}
                      />
                      <Button variant="secondary" onClick={() => addTaskToProject(p)}>
                        <Plus size={13} />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
