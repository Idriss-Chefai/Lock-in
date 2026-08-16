import { z } from "zod";

/**
 * These schemas are the single source of truth for both runtime validation
 * and compile-time types (via z.infer). Never hand-write a duplicate
 * interface for these entities — derive it from here.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const id = z.string().min(1);

// ---------- Daily Log ----------

export const SleepSchema = z.object({
  hours: z.number().min(0).max(24).optional(),
  quality: z.number().int().min(1).max(10).optional(),
});

export const ExpenseRefSchema = z.object({
  id,
  description: z.string(),
  amount: z.number(),
  category: z.string(),
});

export const TrainingRefSchema = z.object({
  id,
  type: z.string(),
  durationMinutes: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const TaskRefSchema = z.object({
  id,
  title: z.string(),
  done: z.boolean().default(false),
});

export const DailyLogSchema = z.object({
  date: isoDate,
  sleep: SleepSchema.optional(),
  energy: z.number().int().min(1).max(10).optional(),
  mood: z.number().int().min(1).max(10).optional(),
  productivity: z.number().int().min(1).max(10).optional(),
  habits: z.record(z.string(), z.union([z.boolean(), z.number()])).default({}),
  training: z.array(TrainingRefSchema).default([]),
  tasks: z.array(TaskRefSchema).default([]),
  expenses: z.array(ExpenseRefSchema).default([]),
  notes: z.string().default(""),
});
export type DailyLog = z.infer<typeof DailyLogSchema>;

// ---------- Habits ----------

export const HabitSchema = z.object({
  id,
  name: z.string().min(1),
  frequency: z.enum(["daily", "weekly", "custom"]),
  target: z.number().int().min(1),
  active: z.boolean().default(true),
  category: z.string().optional(),
  createdAt: isoDate,
});
export type Habit = z.infer<typeof HabitSchema>;

export const HabitsFileSchema = z.object({
  habits: z.array(HabitSchema).default([]),
});

// ---------- Goals ----------

export const GoalSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string().default(""),
  category: z.string().optional(),
  tier: z.enum(["daily", "weekly", "yearly"]).default("weekly"),
  startDate: isoDate,
  targetDate: isoDate,
  metric: z.string(),
  currentValue: z.number(),
  targetValue: z.number(),
  status: z.enum(["not_started", "in_progress", "completed", "abandoned"]).default("not_started"),
  taskIds: z.array(id).default([]),
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalsFileSchema = z.object({
  goals: z.array(GoalSchema).default([]),
});

// ---------- Projects & Tasks ----------

export const TaskSchema = z.object({
  id,
  title: z.string().min(1),
  projectId: id.optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: isoDate.optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).default("todo"),
  estimatedMinutes: z.number().min(0).optional(),
  actualMinutes: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  createdAt: isoDate,
});
export type Task = z.infer<typeof TaskSchema>;

export const ProjectSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string().default(""),
  status: z.enum(["planned", "active", "paused", "completed", "cancelled"]).default("planned"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  startDate: isoDate.optional(),
  targetDate: isoDate.optional(),
  progress: z.number().min(0).max(100).default(0),
  hoursInvested: z.number().min(0).default(0),
  nextAction: z.string().optional(),
  taskIds: z.array(id).default([]),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectsFileSchema = z.object({
  projects: z.array(ProjectSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
});

// ---------- Finance ----------

export const TransactionSchema = z.object({
  id,
  date: isoDate,
  description: z.string(),
  amount: z.number(),
  currency: z.string().default("USD"),
  category: z.string(),
  type: z.enum(["income", "expense"]),
  account: z.string().optional(),
  projectId: id.optional(),
  notes: z.string().optional(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const TransactionsFileSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  transactions: z.array(TransactionSchema).default([]),
});

export const FinanceCategoriesFileSchema = z.object({
  categories: z.array(z.string()).default([]),
});

// ---------- Health / Training ----------

export const ExerciseCategorySchema = z.enum(["strength", "cardio", "mobility", "other"]);

/** What "progress" means for an exercise depends on its category. */
export const ExerciseSchema = z.object({
  id,
  name: z.string().min(1),
  category: ExerciseCategorySchema.default("strength"),
  primaryMetric: z.enum(["weight", "reps", "duration", "distance"]).default("weight"),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const ExerciseSetSchema = z.object({
  exerciseId: id,
  weightKg: z.number().min(0).optional(),
  reps: z.number().int().min(0).optional(),
  durationMinutes: z.number().min(0).optional(),
  distanceKm: z.number().min(0).optional(),
});
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;

export const TrainingSessionSchema = z.object({
  id,
  date: isoDate,
  type: z.string(),
  durationMinutes: z.number().min(0).optional(),
  volume: z.number().min(0).optional(),
  notes: z.string().optional(),
  sets: z.array(ExerciseSetSchema).default([]),
});
export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

export const WeightEntrySchema = z.object({
  date: isoDate,
  kg: z.number().min(0),
});
export type WeightEntry = z.infer<typeof WeightEntrySchema>;

export const HealthFileSchema = z.object({
  sessions: z.array(TrainingSessionSchema).default([]),
  weight: z.array(WeightEntrySchema).default([]),
  exercises: z.array(ExerciseSchema).default([]),
});

// ---------- Nutrition ----------

export const NutritionEntrySchema = z.object({
  id,
  date: isoDate,
  mealName: z.string().default("Meal"),
  calories: z.number().min(0).optional(),
  proteinG: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
});
export type NutritionEntry = z.infer<typeof NutritionEntrySchema>;

export const NutritionFileSchema = z.object({
  entries: z.array(NutritionEntrySchema).default([]),
});

// ---------- Knowledge ----------

export const BookSchema = z.object({
  id,
  title: z.string().min(1),
  author: z.string().optional(),
  status: z.enum(["queued", "reading", "finished", "abandoned"]).default("queued"),
  started: isoDate.optional(),
  finished: isoDate.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  topics: z.array(z.string()).default([]),
  notesLocation: z.string().optional(),
  coverUrl: z.string().optional(),
});
export type Book = z.infer<typeof BookSchema>;

export const BooksFileSchema = z.object({
  books: z.array(BookSchema).default([]),
});

export const MediaKindSchema = z.enum(["youtube", "movie", "show", "podcast"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const MediaItemSchema = z.object({
  id,
  title: z.string().min(1),
  kind: MediaKindSchema.default("youtube"),
  status: z.enum(["queued", "watching", "finished", "abandoned"]).default("queued"),
  started: isoDate.optional(),
  finished: isoDate.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  topics: z.array(z.string()).default([]),
  notesLocation: z.string().optional(),
  coverUrl: z.string().optional(),
  url: z.string().optional(),
  creator: z.string().optional(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

export const MediaFileSchema = z.object({
  items: z.array(MediaItemSchema).default([]),
});

// ---------- Reviews ----------


export const ReviewSchema = z.object({
  period: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  wentWell: z.string().default(""),
  wentBadly: z.string().default(""),
  learned: z.string().default(""),
  change: z.string().default(""),
  nextPriorities: z.string().default(""),
});
export type Review = z.infer<typeof ReviewSchema>;

// ---------- Settings ----------

export const SettingsSchema = z.object({
  name: z.string().default(""),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  weekStartsOn: z.literal("monday").default("monday"),
  currency: z.string().default("USD"),
  displayMode: z.enum(["compact", "normal", "wide"]).default("normal"),
  fontScale: z.number().min(0.85).max(1.3).default(1),
  hideTopBar: z.boolean().default(false),
  fullscreen: z.boolean().default(false),
  windowControlsOnHover: z.boolean().default(false),
  dataVersion: z.number().int().default(1),
});
export type Settings = z.infer<typeof SettingsSchema>;
