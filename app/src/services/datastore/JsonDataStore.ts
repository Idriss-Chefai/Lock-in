import type { DataStore, WeightEntry } from "./DataStore";
import {
  DailyLogSchema,
  HabitsFileSchema,
  GoalsFileSchema,
  ProjectsFileSchema,
  TransactionsFileSchema,
  FinanceCategoriesFileSchema,
  HealthFileSchema,
  NutritionFileSchema,
  BooksFileSchema,
  MediaFileSchema,
  ReviewSchema,
  SettingsSchema,
  type DailyLog,
  type Habit,
  type Goal,
  type Project,
  type Task,
  type Transaction,
  type TrainingSession,
  type Exercise,
  type NutritionEntry,
  type Book,
  type MediaItem,
  type Review,
  type Settings,
} from "../validation/schemas";

/**
 * JSON-file-backed DataStore. All reads validate against Zod schemas.
 * All writes go through a safe-write path in the Electron main process
 * (write temp file, verify it parses, rename over the original) — see
 * electron/main.js. The renderer never touches the filesystem directly;
 * it only calls the narrow `window.lifeos` API exposed by the preload
 * script, which is scoped to the project's data/ and exports/ folders.
 */
export class JsonDataStore implements DataStore {
  private dailyLogCache = new Map<string, DailyLog>();

  // ---------- low-level read/write via IPC ----------

  private async readJson(relPath: string): Promise<unknown | null> {
    const fileExists = await window.lifeos.exists(relPath);
    if (!fileExists) return null;
    const text = await window.lifeos.readText(relPath);
    return JSON.parse(text);
  }

  private async writeJsonSafe(relPath: string, data: unknown): Promise<void> {
    const serialized = JSON.stringify(data, null, 2) + "\n"; // deterministic, git-friendly
    await window.lifeos.writeTextSafe(relPath, serialized);
  }

  // ---------- Daily Logs ----------

  async getDailyLog(date: string): Promise<DailyLog | null> {
    if (this.dailyLogCache.has(date)) {
      return this.dailyLogCache.get(date)!;
    }
    const raw = await this.readJson(`daily/${date}.json`);
    if (!raw) return null;
    const parsed = DailyLogSchema.parse(raw);
    this.dailyLogCache.set(date, parsed);
    return parsed;
  }

  async saveDailyLog(log: DailyLog): Promise<void> {
    const validated = DailyLogSchema.parse(log);
    await this.writeJsonSafe(`daily/${validated.date}.json`, validated);
    this.dailyLogCache.set(validated.date, validated);
  }

  async listDailyLogs(fromDate: string, toDate: string): Promise<DailyLog[]> {
    const entries = await window.lifeos.readDir("daily");
    const logs: DailyLog[] = [];
    for (const entry of entries) {
      if (!entry.isFile || !entry.name.endsWith(".json") || entry.name.endsWith(".tmp")) continue;
      const date = entry.name.replace(".json", "");
      if (date < fromDate || date > toDate) continue;
      const log = await this.getDailyLog(date);
      if (log) logs.push(log);
    }
    return logs.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ---------- Habits ----------

  async getHabits(): Promise<Habit[]> {
    const raw = await this.readJson("habits/habits.json");
    if (!raw) return [];
    return HabitsFileSchema.parse(raw).habits;
  }

  async saveHabit(habit: Habit): Promise<void> {
    const habits = await this.getHabits();
    const idx = habits.findIndex((h) => h.id === habit.id);
    if (idx >= 0) habits[idx] = habit;
    else habits.push(habit);
    await this.writeJsonSafe("habits/habits.json", HabitsFileSchema.parse({ habits }));
  }

  async deleteHabit(id: string): Promise<void> {
    const habits = (await this.getHabits()).filter((h) => h.id !== id);
    await this.writeJsonSafe("habits/habits.json", HabitsFileSchema.parse({ habits }));
  }

  // ---------- Goals ----------

  async getGoals(): Promise<Goal[]> {
    const raw = await this.readJson("goals/goals.json");
    if (!raw) return [];
    return GoalsFileSchema.parse(raw).goals;
  }

  async saveGoal(goal: Goal): Promise<void> {
    const goals = await this.getGoals();
    const idx = goals.findIndex((g) => g.id === goal.id);
    if (idx >= 0) goals[idx] = goal;
    else goals.push(goal);
    await this.writeJsonSafe("goals/goals.json", GoalsFileSchema.parse({ goals }));
  }

  async deleteGoal(id: string): Promise<void> {
    const goals = (await this.getGoals()).filter((g) => g.id !== id);
    await this.writeJsonSafe("goals/goals.json", GoalsFileSchema.parse({ goals }));
  }

  // ---------- Projects & Tasks ----------

  private async getProjectsFile() {
    const raw = await this.readJson("projects/projects.json");
    return ProjectsFileSchema.parse(raw ?? { projects: [], tasks: [] });
  }

  async getProjects(): Promise<Project[]> {
    return (await this.getProjectsFile()).projects;
  }

  async saveProject(project: Project): Promise<void> {
    const file = await this.getProjectsFile();
    const idx = file.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) file.projects[idx] = project;
    else file.projects.push(project);
    await this.writeJsonSafe("projects/projects.json", ProjectsFileSchema.parse(file));
  }

  async deleteProject(id: string): Promise<void> {
    const file = await this.getProjectsFile();
    file.projects = file.projects.filter((p) => p.id !== id);
    await this.writeJsonSafe("projects/projects.json", ProjectsFileSchema.parse(file));
  }

  async getTasks(): Promise<Task[]> {
    return (await this.getProjectsFile()).tasks;
  }

  async saveTask(task: Task): Promise<void> {
    const file = await this.getProjectsFile();
    const idx = file.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) file.tasks[idx] = task;
    else file.tasks.push(task);
    await this.writeJsonSafe("projects/projects.json", ProjectsFileSchema.parse(file));
  }

  async deleteTask(id: string): Promise<void> {
    const file = await this.getProjectsFile();
    file.tasks = file.tasks.filter((t) => t.id !== id);
    await this.writeJsonSafe("projects/projects.json", ProjectsFileSchema.parse(file));
  }

  // ---------- Finance ----------
  // Chunked by month to keep files small and diffs readable.

  async getTransactions(month: string): Promise<Transaction[]> {
    const raw = await this.readJson(`finance/transactions/${month}.json`);
    if (!raw) return [];
    return TransactionsFileSchema.parse(raw).transactions;
  }

  async saveTransaction(month: string, tx: Transaction): Promise<void> {
    const transactions = await this.getTransactions(month);
    const idx = transactions.findIndex((t) => t.id === tx.id);
    if (idx >= 0) transactions[idx] = tx;
    else transactions.push(tx);
    await this.writeJsonSafe(
      `finance/transactions/${month}.json`,
      TransactionsFileSchema.parse({ month, transactions })
    );
  }

  async deleteTransaction(month: string, id: string): Promise<void> {
    const transactions = (await this.getTransactions(month)).filter((t) => t.id !== id);
    await this.writeJsonSafe(
      `finance/transactions/${month}.json`,
      TransactionsFileSchema.parse({ month, transactions })
    );
  }

  async listAvailableTransactionMonths(): Promise<string[]> {
    const entries = await window.lifeos.readDir("finance/transactions");
    return entries
      .filter((e) => e.isFile && e.name.endsWith(".json"))
      .map((e) => e.name.replace(".json", ""))
      .sort();
  }

  async getFinanceCategories(): Promise<string[]> {
    const raw = await this.readJson("finance/categories.json");
    if (!raw) return [];
    return FinanceCategoriesFileSchema.parse(raw).categories;
  }

  async addFinanceCategory(category: string): Promise<void> {
    const trimmed = category.trim();
    if (!trimmed) return;
    const categories = await this.getFinanceCategories();
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
    categories.push(trimmed);
    await this.writeJsonSafe(
      "finance/categories.json",
      FinanceCategoriesFileSchema.parse({ categories: categories.sort() })
    );
  }

  // ---------- Health ----------

  private async getHealthFile() {
    const raw = await this.readJson("health/training.json");
    return HealthFileSchema.parse(raw ?? { sessions: [], weight: [], exercises: [] });
  }

  async getTrainingSessions(): Promise<TrainingSession[]> {
    return (await this.getHealthFile()).sessions;
  }

  async saveTrainingSession(session: TrainingSession): Promise<void> {
    const file = await this.getHealthFile();
    const idx = file.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) file.sessions[idx] = session;
    else file.sessions.push(session);
    await this.writeJsonSafe("health/training.json", HealthFileSchema.parse(file));
  }

  async deleteTrainingSession(id: string): Promise<void> {
    const file = await this.getHealthFile();
    file.sessions = file.sessions.filter((s) => s.id !== id);
    await this.writeJsonSafe("health/training.json", HealthFileSchema.parse(file));
  }

  async getWeightEntries(): Promise<WeightEntry[]> {
    return (await this.getHealthFile()).weight;
  }

  async saveWeightEntry(entry: WeightEntry): Promise<void> {
    const file = await this.getHealthFile();
    const idx = file.weight.findIndex((w) => w.date === entry.date);
    if (idx >= 0) file.weight[idx] = entry;
    else file.weight.push(entry);
    await this.writeJsonSafe("health/training.json", HealthFileSchema.parse(file));
  }

  async getExercises(): Promise<Exercise[]> {
    return (await this.getHealthFile()).exercises;
  }

  async saveExercise(exercise: Exercise): Promise<void> {
    const file = await this.getHealthFile();
    const idx = file.exercises.findIndex((e) => e.id === exercise.id);
    if (idx >= 0) file.exercises[idx] = exercise;
    else file.exercises.push(exercise);
    await this.writeJsonSafe("health/training.json", HealthFileSchema.parse(file));
  }

  async deleteExercise(id: string): Promise<void> {
    const file = await this.getHealthFile();
    file.exercises = file.exercises.filter((e) => e.id !== id);
    await this.writeJsonSafe("health/training.json", HealthFileSchema.parse(file));
  }

  // ---------- Nutrition ----------

  private async getNutritionFile() {
    const raw = await this.readJson("health/nutrition.json");
    return NutritionFileSchema.parse(raw ?? { entries: [] });
  }

  async getNutritionEntries(): Promise<NutritionEntry[]> {
    return (await this.getNutritionFile()).entries;
  }

  async saveNutritionEntry(entry: NutritionEntry): Promise<void> {
    const file = await this.getNutritionFile();
    const idx = file.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) file.entries[idx] = entry;
    else file.entries.push(entry);
    await this.writeJsonSafe("health/nutrition.json", NutritionFileSchema.parse(file));
  }

  async deleteNutritionEntry(id: string): Promise<void> {
    const file = await this.getNutritionFile();
    file.entries = file.entries.filter((e) => e.id !== id);
    await this.writeJsonSafe("health/nutrition.json", NutritionFileSchema.parse(file));
  }

  // ---------- Knowledge ----------

  async getBooks(): Promise<Book[]> {
    const raw = await this.readJson("knowledge/books/books.json");
    if (!raw) return [];
    return BooksFileSchema.parse(raw).books;
  }

  async saveBook(book: Book): Promise<void> {
    const books = await this.getBooks();
    const idx = books.findIndex((b) => b.id === book.id);
    if (idx >= 0) books[idx] = book;
    else books.push(book);
    await this.writeJsonSafe("knowledge/books/books.json", BooksFileSchema.parse({ books }));
  }

  async deleteBook(id: string): Promise<void> {
    const books = (await this.getBooks()).filter((b) => b.id !== id);
    await this.writeJsonSafe("knowledge/books/books.json", BooksFileSchema.parse({ books }));
  }

  async getMediaItems(): Promise<MediaItem[]> {
    const raw = await this.readJson("knowledge/media/media.json");
    if (!raw) return [];
    return MediaFileSchema.parse(raw).items;
  }

  async saveMediaItem(item: MediaItem): Promise<void> {
    const items = await this.getMediaItems();
    const idx = items.findIndex((entry) => entry.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    await this.writeJsonSafe("knowledge/media/media.json", MediaFileSchema.parse({ items }));
  }

  async deleteMediaItem(id: string): Promise<void> {
    const items = (await this.getMediaItems()).filter((entry) => entry.id !== id);
    await this.writeJsonSafe("knowledge/media/media.json", MediaFileSchema.parse({ items }));
  }

  // ---------- Reviews ----------

  async getReview(period: string): Promise<Review | null> {
    const isWeekly = /^\d{4}-W\d{2}$/.test(period);
    const path = isWeekly ? `reviews/weekly/${period}.json` : `reviews/monthly/${period}.json`;
    const raw = await this.readJson(path);
    if (!raw) return null;
    return ReviewSchema.parse(raw);
  }

  async saveReview(review: Review): Promise<void> {
    const validated = ReviewSchema.parse(review);
    const isWeekly = /^\d{4}-W\d{2}$/.test(validated.period);
    const path = isWeekly
      ? `reviews/weekly/${validated.period}.json`
      : `reviews/monthly/${validated.period}.json`;
    await this.writeJsonSafe(path, validated);
  }

  // ---------- Settings ----------

  async getSettings(): Promise<Settings> {
    const raw = await this.readJson("settings/settings.json");
    if (!raw) {
      const defaults = SettingsSchema.parse({});
      await this.writeJsonSafe("settings/settings.json", defaults);
      return defaults;
    }
    return SettingsSchema.parse(raw);
  }

  async saveSettings(settings: Settings): Promise<void> {
    const validated = SettingsSchema.parse(settings);
    await this.writeJsonSafe("settings/settings.json", validated);
  }

  // ---------- Data management ----------

  async exportAll(): Promise<Record<string, unknown>> {
    const [habits, goals, projectsFile, health, books, media, settings, months] = await Promise.all([
      this.getHabits(),
      this.getGoals(),
      this.getProjectsFile(),
      this.getHealthFile(),
      this.getBooks(),
      this.getMediaItems(),
      this.getSettings(),
      this.listAvailableTransactionMonths(),
    ]);

    const transactionsByMonth: Record<string, Transaction[]> = {};
    for (const m of months) {
      transactionsByMonth[m] = await this.getTransactions(m);
    }

    const dailyLogs = await this.listDailyLogs("0000-01-01", "9999-12-31");

    return {
      exportedAt: new Date().toISOString(),
      dailyLogs,
      habits,
      goals,
      projects: projectsFile.projects,
      tasks: projectsFile.tasks,
      health,
      books,
      media,
      transactionsByMonth,
      settings,
    };
  }

  async importAll(data: Record<string, unknown>): Promise<void> {
    // Import is intentionally conservative: validate everything BEFORE
    // writing anything, so a bad import file can't half-corrupt real data.
    const dailyLogs = ((data.dailyLogs as unknown[]) ?? []).map((d) => DailyLogSchema.parse(d));
    const habits = HabitsFileSchema.parse({ habits: data.habits ?? [] });
    const goals = GoalsFileSchema.parse({ goals: data.goals ?? [] });
    const projectsFile = ProjectsFileSchema.parse({
      projects: data.projects ?? [],
      tasks: data.tasks ?? [],
    });
    const health = HealthFileSchema.parse(data.health ?? { sessions: [], weight: [] });
    const books = BooksFileSchema.parse({ books: data.books ?? [] });
    const media = MediaFileSchema.parse({ items: data.media ?? [] });
    const settings = SettingsSchema.parse(data.settings ?? {});
    const transactionsByMonth = (data.transactionsByMonth as Record<string, unknown[]>) ?? {};

    // All validated — now commit.
    for (const log of dailyLogs) await this.saveDailyLog(log);
    await this.writeJsonSafe("habits/habits.json", habits);
    await this.writeJsonSafe("goals/goals.json", goals);
    await this.writeJsonSafe("projects/projects.json", projectsFile);
    await this.writeJsonSafe("health/training.json", health);
    await this.writeJsonSafe("knowledge/books/books.json", books);
    await this.writeJsonSafe("knowledge/media/media.json", media);
    await this.writeJsonSafe("settings/settings.json", settings);
    for (const [month, txs] of Object.entries(transactionsByMonth)) {
      const parsed = TransactionsFileSchema.parse({ month, transactions: txs });
      await this.writeJsonSafe(`finance/transactions/${month}.json`, parsed);
    }
  }

  async wipeAllData(): Promise<void> {
    const paths = [
      "daily",
      "habits",
      "goals",
      "projects",
      "finance",
      "health",
      "knowledge",
      "reviews",
      "settings",
    ];

    for (const relPath of paths) {
      await window.lifeos.remove(relPath);
    }

    const defaultSettings = SettingsSchema.parse({});
    await this.writeJsonSafe("settings/settings.json", defaultSettings);
  }

  async createBackup(): Promise<string> {
    const snapshot = await this.exportAll();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const relPath = `backup-${stamp}.json`;
    const serialized = JSON.stringify(snapshot, null, 2) + "\n";
    return window.lifeos.writeExport(relPath, serialized);
  }
}
