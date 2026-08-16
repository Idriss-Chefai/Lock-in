import type {
  DailyLog,
  Habit,
  Goal,
  Project,
  Task,
  Transaction,
  TrainingSession,
  WeightEntry,
  Exercise,
  NutritionEntry,
  Book,
  MediaItem,
  Review,
  Settings,
} from "../validation/schemas";

// Re-export so callers can import everything from one place.
export type { WeightEntry } from "../validation/schemas";

/**
 * Abstract persistence boundary. The rest of the app talks only to this
 * interface — never to the filesystem directly. Today it's backed by
 * JsonDataStore (see JsonDataStore.ts). If usage ever outgrows JSON files,
 * a SqliteDataStore can implement this same interface and the app layer
 * doesn't change.
 */
export interface DataStore {
  // Daily logs
  getDailyLog(date: string): Promise<DailyLog | null>;
  saveDailyLog(log: DailyLog): Promise<void>;
  listDailyLogs(fromDate: string, toDate: string): Promise<DailyLog[]>;

  // Habits
  getHabits(): Promise<Habit[]>;
  saveHabit(habit: Habit): Promise<void>;
  deleteHabit(id: string): Promise<void>;

  // Goals
  getGoals(): Promise<Goal[]>;
  saveGoal(goal: Goal): Promise<void>;
  deleteGoal(id: string): Promise<void>;

  // Projects & tasks
  getProjects(): Promise<Project[]>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  getTasks(): Promise<Task[]>;
  saveTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // Finance
  getTransactions(month: string): Promise<Transaction[]>;
  saveTransaction(month: string, tx: Transaction): Promise<void>;
  deleteTransaction(month: string, id: string): Promise<void>;
  listAvailableTransactionMonths(): Promise<string[]>;
  getFinanceCategories(): Promise<string[]>;
  addFinanceCategory(category: string): Promise<void>;

  // Health
  getTrainingSessions(): Promise<TrainingSession[]>;
  saveTrainingSession(session: TrainingSession): Promise<void>;
  deleteTrainingSession(id: string): Promise<void>;
  getWeightEntries(): Promise<WeightEntry[]>;
  saveWeightEntry(entry: WeightEntry): Promise<void>;
  getExercises(): Promise<Exercise[]>;
  saveExercise(exercise: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;

  // Nutrition
  getNutritionEntries(): Promise<NutritionEntry[]>;
  saveNutritionEntry(entry: NutritionEntry): Promise<void>;
  deleteNutritionEntry(id: string): Promise<void>;

  // Knowledge
  getBooks(): Promise<Book[]>;
  saveBook(book: Book): Promise<void>;
  deleteBook(id: string): Promise<void>;
  getMediaItems(): Promise<MediaItem[]>;
  saveMediaItem(item: MediaItem): Promise<void>;
  deleteMediaItem(id: string): Promise<void>;

  // Reviews
  getReview(period: string): Promise<Review | null>;
  saveReview(review: Review): Promise<void>;

  // Settings
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  // Data management
  exportAll(): Promise<Record<string, unknown>>;
  importAll(data: Record<string, unknown>): Promise<void>;
  wipeAllData(): Promise<void>;
  createBackup(): Promise<string>; // returns backup path
}
