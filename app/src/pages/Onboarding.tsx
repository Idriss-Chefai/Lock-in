import { useEffect, useState } from "react";
import { FolderOpen, LockKeyhole, ArrowRight, Check, ChevronLeft } from "lucide-react";
import { Button, Input, Select } from "../components/ui";
import { useDataStore } from "../services/datastore/context";
import { newId, todayIso } from "../services/id";
import type { Habit } from "../services/validation/schemas";

type OnboardingStep = "welcome" | "location" | "confirm" | "profile" | "currency" | "first-habits" | "done";

const CURRENCIES = ["USD", "EUR", "GBP", "TND", "JPY", "CAD"];
const DEFAULT_HABITS = ["Gym", "Read 20min", "Meditate", "No coffee after 2pm"];

interface OnboardingPageProps {
  mode: "first-run" | "replay";
  onComplete: () => void;
}

export function OnboardingPage({ mode, onComplete }: OnboardingPageProps) {
  const store = useDataStore();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [chosenDir, setChosenDir] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDataDir, setCurrentDataDir] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "replay") return;
    let active = true;
    Promise.all([store.getSettings(), store.getHabits(), window.lifeos.getCurrentDataDir()]).then(([settings, habits, dataDir]) => {
      if (!active) return;
      setName(settings.name);
      setCurrency(settings.currency);
      setSelectedHabits(habits.filter((habit) => habit.active).map((habit) => habit.name).filter((habit) => DEFAULT_HABITS.includes(habit)));
      setCurrentDataDir(dataDir);
      setChosenDir(dataDir);
    }).catch(() => setError("Current setup could not be loaded."));
    return () => { active = false; };
  }, [mode, store]);

  async function pickLocation() {
    setError(null);
    const dir = await window.lifeos.pickDataDir();
    if (!dir) return;
    const check = await window.lifeos.checkDataDir(dir);
    setChosenDir(dir);
    setHasExistingData(check.hasExistingData);
    setStep("confirm");
  }

  function keepCurrentLocation() {
    if (!currentDataDir) return;
    setChosenDir(currentDataDir);
    setStep("profile");
  }

  async function configureDataDir() {
    if (!chosenDir || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      await window.lifeos.completeSetup(chosenDir);
      setStep("profile");
      setFinishing(false);
    } catch (setupError) {
      setFinishing(false);
      setError(setupError instanceof Error ? setupError.message : "Setup could not be completed.");
    }
  }

  async function finishFreshSetup(includeHabits = true) {
    if (finishing) return;
    setFinishing(true);
    setError(null);
    try {
      const settings = await store.getSettings();
      await store.saveSettings({ ...settings, name: name.trim(), currency });
      if (includeHabits) {
        const existingHabits = await store.getHabits();
        if (mode === "replay") {
          const wanted = new Set([...selectedHabits, ...(customHabit.trim() ? [customHabit.trim()] : [])]);
          await Promise.all(existingHabits.filter((habit) => habit.active && !wanted.has(habit.name)).map((habit) => store.deleteHabit(habit.id)));
          await Promise.all([...wanted].filter((habitName) => !existingHabits.some((habit) => habit.name === habitName)).map((habitName) => store.saveHabit({ id: newId(), name: habitName, frequency: "daily", target: 1, active: true, createdAt: todayIso() })));
        } else {
          const habits: Habit[] = selectedHabits.map((habitName) => ({ id: newId(), name: habitName, frequency: "daily", target: 1, active: true, createdAt: todayIso() }));
          if (customHabit.trim()) habits.push({ id: newId(), name: customHabit.trim(), frequency: "daily", target: 1, active: true, createdAt: todayIso() });
          await Promise.all(habits.map((habit) => store.saveHabit(habit)));
        }
      }
      setStep("done");
      onComplete();
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Setup could not be completed.");
      setFinishing(false);
    }
  }

  async function finishExistingSetup() {
    if (!chosenDir || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      await window.lifeos.completeSetup(chosenDir);
      if (mode === "replay") setStep("profile");
      else onComplete();
    } catch (setupError) {
      setFinishing(false);
      setError(setupError instanceof Error ? setupError.message : "Setup could not be completed.");
    }
  }

  const habitOptions = [...DEFAULT_HABITS, ...selectedHabits.filter((habit) => !DEFAULT_HABITS.includes(habit))];

  return (
    <main className="min-h-screen bg-surface-sunken flex items-center justify-center p-6">
      <section className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="w-12 h-12 rounded-xl bg-accent-muted text-accent flex items-center justify-center mb-6">
          {step === "welcome" ? <LockKeyhole size={24} /> : step === "location" ? <FolderOpen size={24} /> : <Check size={24} />}
        </div>
        {step === "welcome" && (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Lock In</p>
            <h1 className="text-3xl font-semibold text-ink mt-2">Make room to lock in.</h1>
            <p className="text-ink-muted mt-4 leading-relaxed">A private space for your days, goals, health, and focus. Your data stays local and remains plain JSON you can always inspect.</p>
            <Button className="mt-8" onClick={() => setStep("location")}>Get started <ArrowRight size={16} /></Button>
          </>
        )}
        {step === "location" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">Choose your data folder</h1>
            <p className="text-ink-muted mt-3 leading-relaxed">This is where all your data lives: plain JSON, nothing leaves your machine. Choose a folder you can back up or move with the rest of your Lock In setup.</p>
            {mode === "replay" && currentDataDir && (
              <>
                <p className="mt-5 px-3 py-2 rounded-lg bg-surface-sunken border border-border text-sm text-ink break-all">Currently: {currentDataDir}</p>
                <Button className="mt-6" onClick={keepCurrentLocation}>Keep current location <ArrowRight size={16} /></Button>
                <Button variant="secondary" className="mt-3" onClick={() => void pickLocation()}><FolderOpen size={16} /> Change location instead</Button>
              </>
            )}
            {mode === "first-run" && <Button className="mt-8" onClick={() => void pickLocation()}><FolderOpen size={16} /> Choose folder</Button>}
          </>
        )}
        {step === "confirm" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">{hasExistingData ? "Existing Lock In data found" : "Ready to begin?"}</h1>
            <p className="text-ink-muted mt-3">Lock In will use this folder for your data and exports:</p>
            <p className="mt-3 px-3 py-2 rounded-lg bg-surface-sunken border border-border text-sm text-ink break-all">{chosenDir}</p>
            {hasExistingData ? (
              <p className="mt-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-ink">Found an existing Lock In data folder here — you&apos;ll pick up right where you left off.</p>
            ) : (
              <p className="mt-5 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">This folder is empty — Lock In will start fresh here with no existing logs, habits, or history. If you meant to use your existing data, go back and pick the folder that already contains it.</p>
            )}
            <div className="flex gap-3 mt-8">
              <Button variant="secondary" onClick={() => setStep("location")} disabled={finishing}><ChevronLeft size={16} /> Go back</Button>
              <Button onClick={() => void (hasExistingData ? finishExistingSetup() : configureDataDir())} disabled={finishing}>{finishing ? "Setting up…" : hasExistingData ? "Use existing data" : "Continue setup"} <ArrowRight size={16} /></Button>
            </div>
          </>
        )}
        {step === "profile" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">What should we call you?</h1>
            <p className="text-ink-muted mt-3">This name appears on your dashboard. You can change it later in Settings.</p>
            <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="mt-6 w-full" />
            <Button className="mt-8" onClick={() => setStep("currency")}><ArrowRight size={16} /> Continue</Button>
          </>
        )}
        {step === "currency" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">Choose your currency</h1>
            <p className="text-ink-muted mt-3">This sets the default currency for your finance view.</p>
            <Select value={currency} onChange={setCurrency} options={CURRENCIES.map((value) => ({ value, label: value }))} className="mt-6" />
            <Button className="mt-8" onClick={() => setStep("first-habits")}><ArrowRight size={16} /> Continue</Button>
          </>
        )}
        {step === "first-habits" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">Start with a few habits</h1>
            <p className="text-ink-muted mt-3">Optional: choose defaults or add your own. You can edit these anytime.</p>
            <div className="mt-6 space-y-3">
              {habitOptions.map((habit) => (
                <label key={habit} className="flex items-center gap-3 text-sm text-ink">
                  <input type="checkbox" checked={selectedHabits.includes(habit)} onChange={() => setSelectedHabits((current) => current.includes(habit) ? current.filter((item) => item !== habit) : [...current, habit])} className="accent-accent" />
                  {habit}
                </label>
              ))}
              <Input value={customHabit} onChange={(event) => setCustomHabit(event.target.value)} placeholder="Add your own" className="w-full" />
            </div>
            <Button className="mt-8" onClick={() => void finishFreshSetup()} disabled={finishing}>{finishing ? "Saving…" : "Finish setup"} <Check size={16} /></Button>
            <Button variant="ghost" className="mt-2" onClick={() => void finishFreshSetup(false)} disabled={finishing}>Skip for now</Button>
          </>
        )}
        {step === "done" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">You&apos;re ready to lock in.</h1>
            <p className="text-ink-muted mt-3">Your Lock In space is ready.</p>
          </>
        )}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </section>
    </main>
  );
}