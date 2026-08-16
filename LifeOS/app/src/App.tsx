import { useEffect, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { DataStoreProvider, useDataStore } from "./services/datastore/context";

function applyDisplaySettings(settings: { displayMode?: "compact" | "normal" | "wide"; fontScale?: number; hideTopBar?: boolean; fullscreen?: boolean; windowControlsOnHover?: boolean }) {
  const mode = settings.displayMode ?? "normal";
  const root = document.documentElement;
  root.style.setProperty("--page-padding", mode === "compact" ? "0.5rem" : mode === "wide" ? "1.25rem" : "0.9rem");
  root.style.setProperty("font-size", `${(settings.fontScale ?? 1) * 100}%`);
  document.body.dataset.displayMode = mode;
  document.body.classList.toggle("top-bar-hidden", Boolean(settings.hideTopBar));
  document.body.classList.toggle("lifeos-fullscreen", Boolean(settings.fullscreen));
  document.body.classList.toggle("window-controls-enabled", Boolean(settings.windowControlsOnHover));
  window.lifeos.applyUiState({
    hideMenuBar: Boolean(settings.hideTopBar),
    fullscreen: Boolean(settings.fullscreen),
    windowControlsOnHover: Boolean(settings.windowControlsOnHover),
  });
}
import { Sidebar } from "./components/Sidebar";
import { CalendarPanel } from "./components/CalendarPanel";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTheme } from "./hooks/useTheme";
import { DashboardPage } from "./pages/Dashboard";
import { TodayPage } from "./pages/Today";
import { TasksPage } from "./pages/Tasks";
import { HabitsPage } from "./pages/Habits";
import { GoalsPage } from "./pages/Goals";
import { ProjectsPage } from "./pages/Projects";
import { HealthPage } from "./pages/Health";
import { NutritionPage } from "./pages/Nutrition";
import { FinancePage } from "./pages/Finance";
import { KnowledgePage } from "./pages/Knowledge";
import { ReviewsPage } from "./pages/Reviews";
import { JournalPage } from "./pages/Journal";
import { AnalyticsPage } from "./pages/Analytics";
import { SettingsPage } from "./pages/Settings";
import { GuidePage } from "./pages/Guide";
import { LogsHomePage } from "./pages/LogsHome";
import { AthleticsHomePage } from "./pages/AthleticsHome";

function WindowControls() {
  const store = useDataStore();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void store.getSettings().then((settings) => {
      if (!active) return;
      setEnabled(Boolean(settings.windowControlsOnHover));
    });
    return () => { active = false; };
  }, [store]);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      setVisible(event.clientY <= 18);
    };

    const onPointerLeave = () => setVisible(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  return (
    <div className="window-chrome">
      <div className="window-chrome-drag" />
      <div className="window-chrome-buttons">
        <button type="button" className="window-btn minimize" aria-label="Minimize" onClick={() => void window.lifeos.minimizeWindow()} />
        <button type="button" className="window-btn maximize" aria-label="Maximize" onClick={() => void window.lifeos.maximizeWindow()} />
        <button type="button" className="window-btn close" aria-label="Close" onClick={() => void window.lifeos.closeWindow()} />
      </div>
    </div>
  );
}

function Shell() {
  useTheme();
  useKeyboardShortcuts();
  const store = useDataStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    let active = true;
    store.getSettings().then((settings) => {
      if (!active) return;
      applyDisplaySettings(settings);
    });
    return () => {
      active = false;
    };
  }, [store]);

  return (
    <div className="flex h-screen overflow-hidden app-shell">
      <WindowControls />
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <main className="flex-1 overflow-y-auto bg-surface-sunken min-w-0 app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/day/:date" element={<TodayPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/knowledge/books" element={<KnowledgePage />} />
          <Route path="/knowledge/media" element={<KnowledgePage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/category/logs" element={<LogsHomePage />} />
          <Route path="/category/athletics" element={<AthleticsHomePage />} />
        </Routes>
      </main>
      {/* Persistent calendar — hidden on narrow/docked windows, always on when there's room. */}
      <div className="hidden xl:block h-full">
        <CalendarPanel />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DataStoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </DataStoreProvider>
  );
}
