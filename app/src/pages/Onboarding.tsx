import { useState } from "react";
import { FolderOpen, LockKeyhole, ArrowRight, Check } from "lucide-react";
import { Button } from "../components/ui";

type OnboardingStep = "welcome" | "location" | "confirm";

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [chosenDir, setChosenDir] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickLocation() {
    setError(null);
    const dir = await window.lifeos.pickDataDir();
    if (dir) {
      setChosenDir(dir);
      setStep("confirm");
    }
  }

  async function finish() {
    if (!chosenDir || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      await window.lifeos.completeSetup(chosenDir);
      await window.lifeos.restartApp();
      onComplete();
    } catch (setupError) {
      setFinishing(false);
      setError(setupError instanceof Error ? setupError.message : "Setup could not be completed.");
    }
  }

  return (
    <main className="min-h-screen bg-surface-sunken flex items-center justify-center p-6">
      <section className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="w-12 h-12 rounded-xl bg-accent-muted text-accent flex items-center justify-center mb-6">
          {step === "welcome" ? <LockKeyhole size={24} /> : step === "location" ? <FolderOpen size={24} /> : <Check size={24} />}
        </div>
        {step === "welcome" && (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">LifeOS</p>
            <h1 className="text-3xl font-semibold text-ink mt-2">Make room to lock in.</h1>
            <p className="text-ink-muted mt-4 leading-relaxed">A private space for your days, goals, health, and focus. Your data stays local and remains plain JSON you can always inspect.</p>
            <Button className="mt-8" onClick={() => setStep("location")}>Get started <ArrowRight size={16} /></Button>
          </>
        )}
        {step === "location" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">Choose your data folder</h1>
            <p className="text-ink-muted mt-3 leading-relaxed">This is where all your data lives: plain JSON, nothing leaves your machine. Choose a folder you can back up or move with the rest of your LifeOS setup.</p>
            <Button className="mt-8" onClick={() => void pickLocation()}><FolderOpen size={16} /> Choose folder</Button>
          </>
        )}
        {step === "confirm" && (
          <>
            <h1 className="text-2xl font-semibold text-ink">Ready to begin?</h1>
            <p className="text-ink-muted mt-3">LifeOS will use this folder for your data and exports:</p>
            <p className="mt-3 px-3 py-2 rounded-lg bg-surface-sunken border border-border text-sm text-ink break-all">{chosenDir}</p>
            <div className="flex gap-3 mt-8">
              <Button variant="secondary" onClick={() => setStep("location")} disabled={finishing}>Change</Button>
              <Button onClick={() => void finish()} disabled={finishing}>{finishing ? "Setting up…" : "Finish setup"} <Check size={16} /></Button>
            </div>
          </>
        )}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </section>
    </main>
  );
}