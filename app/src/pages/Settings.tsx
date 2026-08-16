import { useEffect, useRef, useState } from "react";
import { useDataStore } from "../services/datastore/context";
import { useTheme } from "../hooks/useTheme";
import { Card, Button, Select, Input } from "../components/ui";
import { Download, Upload, Save } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "TND", "JPY", "CAD"];

export function SettingsPage() {
  const store = useDataStore();
  const { theme, setTheme } = useTheme();
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [displayMode, setDisplayMode] = useState<"compact" | "normal" | "wide">("normal");
  const [fontScale, setFontScale] = useState(1);
  const [hideTopBar, setHideTopBar] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [windowControlsOnHover, setWindowControlsOnHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    store.getSettings().then((s) => {
      setName(s.name);
      setCurrency(s.currency);
      setDisplayMode(s.displayMode);
      setFontScale(s.fontScale);
      setHideTopBar(s.hideTopBar);
      setFullscreen(s.fullscreen);
      setWindowControlsOnHover(s.windowControlsOnHover);
      window.lifeos.applyUiState({ hideMenuBar: s.hideTopBar, fullscreen: s.fullscreen, windowControlsOnHover: s.windowControlsOnHover });
    });
  }, [store]);

  async function confirmRestartIfNeeded(nextValue: boolean, currentValue: boolean, label: string) {
    if (nextValue === currentValue) return false;
    const confirmed = window.confirm(`${label} requires restarting LifeOS. Restart now?`);
    if (confirmed) {
      await window.lifeos.restartApp();
      return true;
    }
    return false;
  }

  async function persistSettings(next: Partial<{
    name: string;
    currency: string;
    displayMode: "compact" | "normal" | "wide";
    fontScale: number;
    hideTopBar: boolean;
    fullscreen: boolean;
    windowControlsOnHover: boolean;
  }>) {
    const current = await store.getSettings();
    const updated = {
      ...current,
      name: next.name ?? name,
      currency: next.currency ?? currency,
      displayMode: next.displayMode ?? displayMode,
      fontScale: next.fontScale ?? fontScale,
      hideTopBar: next.hideTopBar ?? hideTopBar,
      fullscreen: next.fullscreen ?? fullscreen,
      windowControlsOnHover: next.windowControlsOnHover ?? windowControlsOnHover,
    };

    await store.saveSettings(updated);
    const root = document.documentElement;
    root.style.setProperty("--page-padding", updated.displayMode === "compact" ? "0.5rem" : updated.displayMode === "wide" ? "1.25rem" : "0.9rem");
    root.style.setProperty("font-size", `${updated.fontScale * 100}%`);
    document.body.dataset.displayMode = updated.displayMode;
    document.body.classList.toggle("top-bar-hidden", updated.hideTopBar);
    document.body.classList.toggle("lifeos-fullscreen", updated.fullscreen);
    document.body.classList.toggle("window-controls-enabled", updated.windowControlsOnHover);
    await window.lifeos.applyUiState({ hideMenuBar: updated.hideTopBar, fullscreen: updated.fullscreen, windowControlsOnHover: updated.windowControlsOnHover });
    return updated;
  }

  async function saveProfile() {
    const next = await persistSettings({ name, currency, displayMode, fontScale, hideTopBar, fullscreen, windowControlsOnHover });
    void next;
    setStatus("Profile saved.");
  }

  async function handleExport() {
    const data = await store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported.");
  }

  async function handleBackup() {
    const path = await store.createBackup();
    setStatus(`Backup saved to ${path}`);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await store.importAll(data);
      setStatus("Import complete.");
    } catch (err) {
      setStatus(`Import failed: ${err instanceof Error ? err.message : "invalid file"}`);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold text-ink">Settings</h1>

      <Card title="Profile">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink">Your name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-48"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink">Default currency</span>
            <Select value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </div>
          <Button variant="secondary" onClick={saveProfile}>Save personal info</Button>
        </div>
      </Card>

      <Card title="Appearance & layout">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink">Theme</span>
            <Select
              value={theme}
              onChange={(v) => setTheme(v as "light" | "dark" | "system")}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-ink">Display mode</span>
            <Select
              value={displayMode}
              onChange={(v) => setDisplayMode(v as "compact" | "normal" | "wide")}
              options={[
                { value: "compact", label: "Compact" },
                { value: "normal", label: "Normal" },
                { value: "wide", label: "Wide" },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">Font size</span>
              <span className="text-xs text-ink-faint">{fontScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.85}
              max={1.3}
              step={0.05}
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ink">Hide app menu bar</span>
            <input
              type="checkbox"
              checked={hideTopBar}
              onChange={async (e) => {
                const next = e.target.checked;
                setHideTopBar(next);
                await persistSettings({ hideTopBar: next });
                setStatus("Menu bar setting saved.");
              }}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ink">Fullscreen</span>
            <input
              type="checkbox"
              checked={fullscreen}
              onChange={async (e) => {
                const next = e.target.checked;
                setFullscreen(next);
                await persistSettings({ fullscreen: next });
                setStatus("Fullscreen setting saved.");
              }}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ink">Window controls on hover</span>
            <input
              type="checkbox"
              checked={windowControlsOnHover}
              onChange={async (e) => {
                const next = e.target.checked;
                const current = windowControlsOnHover;
                setWindowControlsOnHover(next);
                await persistSettings({ windowControlsOnHover: next });
                const restartRequired = await confirmRestartIfNeeded(next, current, "Window controls on hover");
                if (!restartRequired) {
                  setStatus("Window controls setting updated.");
                }
              }}
            />
          </label>

          <div className="pt-2 border-t border-border">
            <Button onClick={saveProfile} className="w-full justify-center">
              Apply all settings
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Data management">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">Export all data</p>
              <p className="text-xs text-ink-faint">Download a full JSON snapshot.</p>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={14} /> Export
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">Import data</p>
              <p className="text-xs text-ink-faint">Restore from a previously exported JSON file.</p>
            </div>
            <Button variant="secondary" onClick={handleImportClick}>
              <Upload size={14} /> Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">Create backup</p>
              <p className="text-xs text-ink-faint">Saves a timestamped snapshot to the exports/ folder.</p>
            </div>
            <Button variant="secondary" onClick={handleBackup}>
              <Save size={14} /> Backup now
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">Wipe all local data</p>
              <p className="text-xs text-ink-faint">Deletes all stored logs, goals, tasks, health, knowledge, and settings.</p>
            </div>
            <Button
              variant="danger"
              onClick={async () => {
                const today = new Date().toISOString().slice(0, 10);
                const typed = window.prompt(`Type today's date to confirm full data wipe (${today}):`);
                if (typed === null) return;
                if (typed.trim() !== today) {
                  setStatus("Wipe cancelled: the date did not match today.");
                  return;
                }
                const confirmed = window.confirm("This permanently deletes all local LifeOS data. Are you absolutely sure?");
                if (!confirmed) {
                  setStatus("Wipe cancelled.");
                  return;
                }
                await store.wipeAllData();
                setStatus("All local data wiped. The app will reload with clean defaults.");
                window.location.reload();
              }}
            >
              Wipe data
            </Button>
          </div>
        </div>
        {status && <p className="text-xs text-ink-faint mt-3">{status}</p>}
      </Card>

      <Card title="About">
        <p className="text-sm text-ink-muted">
          LifeOS keeps all data in local JSON files under <code className="text-xs bg-surface-raised px-1 py-0.5 rounded">data/</code>.
          Nothing leaves your machine. Commit that folder to Git yourself whenever you want a version history.
        </p>
      </Card>
    </div>
  );
}
