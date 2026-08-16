// Seeds LifeOS with a full year (365 days) of realistic mock data so you
// can see the app filled in before committing to daily use.
//
// Run from the app/ folder:  node seed.mjs
// Safe to delete after running. Overwrites existing data files for the
// dates/entities it generates — don't run this against real data you
// care about without backing up first (Settings → Backup now).

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const ROOT = join(process.cwd(), "..", "data"); // app/ -> repo root -> data/
const DAYS = 365;

function id() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

async function write(relPath, data) {
  const full = join(ROOT, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function monthKeyFromDate(dateStr) {
  return dateStr.slice(0, 7);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ---------- Exercises ----------
const exercises = [
  { id: id(), name: "Bench Press", category: "strength", primaryMetric: "weight" },
  { id: id(), name: "Squat", category: "strength", primaryMetric: "weight" },
  { id: id(), name: "Deadlift", category: "strength", primaryMetric: "weight" },
  { id: id(), name: "Pull-ups", category: "strength", primaryMetric: "reps" },
  { id: id(), name: "Running", category: "cardio", primaryMetric: "distance" },
  { id: id(), name: "Cycling", category: "cardio", primaryMetric: "distance" },
  { id: id(), name: "Yoga", category: "mobility", primaryMetric: "duration" },
];

// ---------- Habits ----------
const habits = [
  { id: "gym", name: "Gym", frequency: "daily", target: 5, active: true, category: "health", createdAt: daysAgo(DAYS + 10) },
  { id: "read", name: "Read 20min", frequency: "daily", target: 7, active: true, category: "growth", createdAt: daysAgo(DAYS + 10) },
  { id: "meditate", name: "Meditate", frequency: "daily", target: 7, active: true, category: "health", createdAt: daysAgo(300) },
  { id: "nocoffee-after-2", name: "No coffee after 2pm", frequency: "daily", target: 7, active: true, category: "health", createdAt: daysAgo(200) },
];

// ---------- Daily logs + training sessions (1 full year) ----------
const dailyLogs = [];
const trainingSessions = [];
const nutritionEntries = [];

for (let i = DAYS - 1; i >= 0; i--) {
  const date = daysAgo(i);
  const inDeclineWindow = i <= 6;
  const seasonalSleepDrift = Math.sin((DAYS - i) / 30) * 0.4; // slow wave over the year
  const baseSleep = inDeclineWindow ? 5.8 : 7.0 + seasonalSleepDrift;
  const sleepHours = round1(clamp(baseSleep + (Math.random() * 1.4 - 0.7), 4, 9.5));
  const energy = clamp(Math.round(sleepHours * 0.9 + (Math.random() * 2 - 1)), 3, 10);
  const mood = clamp(energy + Math.round(Math.random() * 2 - 1), 3, 10);
  const productivity = clamp(Math.round(energy * 0.85 + (Math.random() * 2 - 1)), 2, 10);

  const habitsDone = {};
  for (const h of habits) {
    if (date < h.createdAt) continue; // skip habits before they existed
    habitsDone[h.id] = Math.random() > 0.3; // ~70% completion
  }

  const tasks = [];
  if (i % 3 === 0) tasks.push({ id: id(), title: "Review project backlog", done: Math.random() > 0.4 });
  if (i % 4 === 0) tasks.push({ id: id(), title: "Reply to emails", done: true });

  const expenses = [];
  if (Math.random() > 0.45) {
    const options = [
      { description: "Groceries", amount: 25 + Math.random() * 40, category: "Food" },
      { description: "Coffee", amount: 3 + Math.random() * 3, category: "Food" },
      { description: "Uber", amount: 8 + Math.random() * 15, category: "Transport" },
      { description: "Streaming", amount: 9 + Math.random() * 6, category: "Subscriptions" },
    ];
    const pick = options[Math.floor(Math.random() * options.length)];
    expenses.push({ id: id(), ...pick, amount: Math.round(pick.amount * 100) / 100 });
  }

  const trainedToday = habitsDone.gym && Math.random() > 0.35;
  const trainingRef = [];
  if (trainedToday) {
    const weekIndex = Math.floor((DAYS - i) / 7); // progresses across the year
    const picks = [...exercises].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
    for (const ex of picks) {
      const sets = [];
      const setCount = ex.primaryMetric === "distance" ? 1 : 3 + Math.floor(Math.random() * 2);
      for (let s = 0; s < setCount; s++) {
        const set = { exerciseId: ex.id };
        if (ex.primaryMetric === "weight") {
          const baseWeight = { "Bench Press": 40, Squat: 60, Deadlift: 80 }[ex.name] ?? 30;
          set.weightKg = Math.round((baseWeight + weekIndex * 0.4 + (Math.random() * 4 - 2)) * 2) / 2;
          set.reps = 5 + Math.floor(Math.random() * 4);
        } else if (ex.primaryMetric === "reps") {
          set.reps = clamp(Math.round(6 + weekIndex * 0.15 + (Math.random() * 3 - 1.5)), 3, 25);
        } else if (ex.primaryMetric === "distance") {
          set.distanceKm = round1(clamp(3 + weekIndex * 0.08 + (Math.random() * 2 - 1), 1, 15));
          set.durationMinutes = Math.round(set.distanceKm * (ex.name === "Cycling" ? 3 : 6));
        } else {
          set.durationMinutes = Math.round(20 + weekIndex * 0.3 + (Math.random() * 10 - 5));
        }
        sets.push(set);
      }
      const sessionId = id();
      trainingSessions.push({ id: sessionId, date, type: ex.name, sets });
      trainingRef.push({ id: sessionId, type: ex.name, durationMinutes: sets[0]?.durationMinutes });
    }
  }

  const nutritionToday = [];
  if (Math.random() > 0.2) {
    const meals = [
      { mealName: "Breakfast", calories: 350 + Math.random() * 200, proteinG: 15 + Math.random() * 15, carbsG: 30 + Math.random() * 30, fatG: 8 + Math.random() * 10 },
      { mealName: "Lunch", calories: 550 + Math.random() * 250, proteinG: 25 + Math.random() * 20, carbsG: 50 + Math.random() * 30, fatG: 15 + Math.random() * 10 },
      { mealName: "Dinner", calories: 500 + Math.random() * 250, proteinG: 25 + Math.random() * 20, carbsG: 45 + Math.random() * 30, fatG: 15 + Math.random() * 10 },
    ];
    for (const m of meals) {
      if (Math.random() > 0.15) {
        nutritionToday.push({
          id: id(),
          date,
          mealName: m.mealName,
          calories: Math.round(m.calories),
          proteinG: Math.round(m.proteinG),
          carbsG: Math.round(m.carbsG),
          fatG: Math.round(m.fatG),
        });
      }
    }
  }
  nutritionEntries.push(...nutritionToday);

  dailyLogs.push({
    date,
    sleep: { hours: sleepHours, quality: clamp(Math.round(sleepHours), 3, 10) },
    energy,
    mood,
    productivity,
    habits: habitsDone,
    training: trainingRef,
    tasks,
    expenses,
    notes: i === 0 ? "Feeling a bit tired this week, need to reset sleep schedule." : "",
  });
}

// ---------- Goals (tiered: daily/weekly/yearly) ----------
const goals = [
  {
    id: id(),
    title: "Launch LifeOS v1",
    description: "Ship a daily-usable version with all core modules working.",
    category: "career",
    tier: "yearly",
    startDate: daysAgo(300),
    targetDate: daysAgo(-30),
    metric: "% complete",
    currentValue: 80,
    targetValue: 100,
    status: "in_progress",
    taskIds: [], // linked below once tasks exist
  },
  {
    id: id(),
    title: "Bench press bodyweight",
    description: "Progressive overload over the year.",
    category: "health",
    tier: "yearly",
    startDate: daysAgo(300),
    targetDate: daysAgo(-60),
    metric: "kg",
    currentValue: 65,
    targetValue: 80,
    status: "in_progress",
    taskIds: [],
  },
  {
    id: id(),
    title: "Read 12 books this year",
    description: "",
    category: "growth",
    tier: "yearly",
    startDate: daysAgo(300),
    targetDate: daysAgo(-65),
    metric: "books",
    currentValue: 7,
    targetValue: 12,
    status: "in_progress",
    taskIds: [],
  },
  {
    id: id(),
    title: "Train 5x this week",
    description: "",
    category: "health",
    tier: "weekly",
    startDate: daysAgo(6),
    targetDate: daysAgo(0),
    metric: "sessions",
    currentValue: 3,
    targetValue: 5,
    status: "in_progress",
    taskIds: [],
  },
  {
    id: id(),
    title: "Clear inbox today",
    description: "",
    category: "productivity",
    tier: "daily",
    startDate: daysAgo(0),
    targetDate: daysAgo(0),
    metric: "% complete",
    currentValue: 60,
    targetValue: 100,
    status: "in_progress",
    taskIds: [],
  },
];

// ---------- Projects & Tasks ----------
const projectAId = id();
const projectBId = id();
const tasks = [
  { id: id(), title: "Design data model", projectId: projectAId, priority: "high", status: "done", tags: ["backend"], createdAt: daysAgo(280) },
  { id: id(), title: "Build Today page", projectId: projectAId, priority: "high", status: "done", tags: ["frontend"], createdAt: daysAgo(260) },
  { id: id(), title: "Build Analytics correlations", projectId: projectAId, priority: "medium", status: "done", tags: ["frontend"], createdAt: daysAgo(120) },
  { id: id(), title: "Add global search", projectId: projectAId, priority: "medium", status: "todo", tags: ["frontend"], createdAt: daysAgo(5) },
  { id: id(), title: "Research training plans", projectId: projectBId, priority: "low", status: "done", tags: [], createdAt: daysAgo(280) },
  { id: id(), title: "Buy new running shoes", projectId: projectBId, priority: "medium", status: "todo", dueDate: daysAgo(-3), tags: [], createdAt: daysAgo(10) },
  { id: id(), title: "Book dentist appointment", priority: "low", status: "todo", dueDate: daysAgo(-7), tags: ["errand"], createdAt: daysAgo(2) },
];

const projects = [
  {
    id: projectAId,
    name: "LifeOS",
    description: "Personal operating system for tracking daily life.",
    status: "active",
    priority: "high",
    startDate: daysAgo(300),
    targetDate: daysAgo(-30),
    progress: 80,
    hoursInvested: 140,
    nextAction: "Add global search",
    taskIds: tasks.filter((t) => t.projectId === projectAId).map((t) => t.id),
  },
  {
    id: projectBId,
    name: "Strength Training Plan",
    description: "Progressive overload program across the year.",
    status: "active",
    priority: "medium",
    startDate: daysAgo(300),
    targetDate: daysAgo(-60),
    progress: 55,
    hoursInvested: 90,
    nextAction: "Buy new running shoes",
    taskIds: tasks.filter((t) => t.projectId === projectBId).map((t) => t.id),
  },
];

// Demonstrate task-driven goal completion: link the yearly "Launch LifeOS
// v1" goal to the same tasks as the LifeOS project.
goals[0].taskIds = tasks.filter((t) => t.projectId === projectAId).map((t) => t.id);

// ---------- Health: weight (bi-weekly across the year) ----------
const weight = [];
for (let i = DAYS - 1; i >= 0; i -= 14) {
  const progress = (DAYS - i) / DAYS;
  weight.push({ date: daysAgo(i), kg: round1(80 - progress * 3 + (Math.random() * 0.5 - 0.25)) });
}

// ---------- Finance (across the year) ----------
const FINANCE_CATEGORIES = ["Food", "Transport", "Rent", "Subscriptions", "Entertainment", "Health"];
function buildTransactions(month) {
  const txs = [];
  txs.push({ id: id(), date: `${month}-01`, description: "Salary", amount: 3200, currency: "USD", category: "Income", type: "income" });
  txs.push({ id: id(), date: `${month}-01`, description: "Rent", amount: 1100, currency: "USD", category: "Rent", type: "expense" });
  const entryCount = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < entryCount; i++) {
    const cat = FINANCE_CATEGORIES[Math.floor(Math.random() * FINANCE_CATEGORIES.length)];
    const desc =
      cat === "Food" ? "Groceries" :
      cat === "Transport" ? "Uber" :
      cat === "Subscriptions" ? "Streaming" :
      cat === "Health" ? "Pharmacy" :
      "Dinner out";
    txs.push({
      id: id(),
      date: `${month}-${String(2 + Math.floor(Math.random() * 26)).padStart(2, "0")}`,
      description: desc,
      amount: Math.round((10 + Math.random() * 60) * 100) / 100,
      currency: "USD",
      category: cat,
      type: "expense",
    });
  }
  return txs;
}

const monthKeys = new Set();
for (let i = 0; i < DAYS; i += 15) monthKeys.add(monthKeyFromDate(daysAgo(i)));
monthKeys.add(monthKeyFromDate(daysAgo(0)));

// ---------- Knowledge ----------
const books = [
  { id: id(), title: "Atomic Habits", author: "James Clear", status: "finished", started: daysAgo(280), finished: daysAgo(260), rating: 5, topics: ["habits", "productivity"], notesLocation: "knowledge/books/atomic-habits.excalidraw" },
  { id: id(), title: "Clean Architecture", author: "Robert C. Martin", status: "finished", started: daysAgo(220), finished: daysAgo(200), rating: 4, topics: ["software"], notesLocation: "knowledge/books/clean-architecture.excalidraw" },
  { id: id(), title: "Deep Work", author: "Cal Newport", status: "finished", started: daysAgo(180), finished: daysAgo(165), rating: 5, topics: ["focus", "productivity"], notesLocation: "knowledge/books/deep-work.excalidraw" },
  { id: id(), title: "The Pragmatic Programmer", author: "David Thomas & Andrew Hunt", status: "finished", started: daysAgo(140), finished: daysAgo(120), rating: 4, topics: ["software"] },
  { id: id(), title: "Thinking, Fast and Slow", author: "Daniel Kahneman", status: "finished", started: daysAgo(100), finished: daysAgo(70), rating: 5, topics: ["psychology"] },
  { id: id(), title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", status: "finished", started: daysAgo(60), finished: daysAgo(30), rating: 5, topics: ["software", "systems"] },
  { id: id(), title: "Sapiens", author: "Yuval Noah Harari", status: "finished", started: daysAgo(25), finished: daysAgo(5), rating: 4, topics: ["history"] },
  { id: id(), title: "Clean Code", author: "Robert C. Martin", status: "reading", started: daysAgo(15), topics: ["software"] },
  { id: id(), title: "The Almanack of Naval Ravikant", author: "Eric Jorgenson", status: "queued", topics: ["philosophy", "wealth"] },
];

// ---------- Write everything ----------
await write("habits/habits.json", { habits });
for (const log of dailyLogs) await write(`daily/${log.date}.json`, log);
await write("goals/goals.json", { goals });
await write("projects/projects.json", { projects, tasks });
await write("health/training.json", { sessions: trainingSessions, weight, exercises });
await write("health/nutrition.json", { entries: nutritionEntries });
for (const month of monthKeys) {
  await write(`finance/transactions/${month}.json`, { month, transactions: buildTransactions(month) });
}
await write("finance/categories.json", { categories: [...FINANCE_CATEGORIES].sort() });
await write("knowledge/books/books.json", { books });
await write("settings/settings.json", { name: "", theme: "system", weekStartsOn: "monday", currency: "USD", dataVersion: 1 });

console.log(`Seed data written to ${ROOT}`);
console.log(`${dailyLogs.length} daily logs, ${trainingSessions.length} training sessions, ${nutritionEntries.length} nutrition entries, ${monthKeys.size} months of transactions.`);
console.log("Run `npm run dev` and open the app. Set your name in Settings to personalize the Dashboard greeting.");
