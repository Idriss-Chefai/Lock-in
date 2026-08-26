export interface TourStep {
  path: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  { path: "/", title: "This is your Dashboard.", body: "Every number here is real. No excuses, no vague feelings — sleep, mood, focus, cash flow. Look at it daily or don't complain when you're behind." },
  { path: "/today", title: "Today.", body: "Log it here, every day, or the rest of this app is just a pretty spreadsheet you never fill in. Habits, tasks, expenses, income — right now, not 'later.'" },
  { path: "/habits", title: "Habits.", body: "Streaks don't lie. Miss a day, the streak resets. That's the whole point." },
  { path: "/lockin", title: "Lock In.", body: "This is where the actual work happens. Pick a skill, start the timer, stop making excuses about not having time." },
  { path: "/tasks", title: "Tasks.", body: "If it's not here, it doesn't exist. Overdue tasks show up in red — that's not decoration, that's a problem." },
  { path: "/finance", title: "Finance.", body: "Money in, money out. You already know if you don't want to look at this page — that's exactly why you should." },
  { path: "/knowledge/books", title: "Knowledge.", body: "Books and media you're actually consuming, tracked. Rate them, log pages/minutes, stop pretending you'll remember what you learned." },
  { path: "/goals", title: "Goals.", body: "Set a real target and a real date. Vague goals produce vague results." },
  { path: "/analytics", title: "Analytics.", body: "This is where patterns show up — sleep vs productivity, habit consistency, spending trends. Not proof of causation, but a mirror. Look in it." },
  { path: "/settings", title: "Settings.", body: "Your data, your folder, your rules. Nothing leaves this machine. Now go use the app." },
];