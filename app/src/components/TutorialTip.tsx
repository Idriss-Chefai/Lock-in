import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDataStore } from "../services/datastore/context";

interface TutorialTipProps {
  tutorialKey: string;
  title: string;
  body: string;
}

export function TutorialTip({ tutorialKey, title, body }: TutorialTipProps) {
  const store = useDataStore();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void store.getSettings().then((settings) => {
      if (active) setSeen(settings.seenTutorials.includes(tutorialKey));
    });
    return () => { active = false; };
  }, [store, tutorialKey]);

  async function dismiss() {
    const settings = await store.getSettings();
    if (settings.seenTutorials.includes(tutorialKey)) {
      setSeen(true);
      return;
    }
    await store.saveSettings({ ...settings, seenTutorials: [...settings.seenTutorials, tutorialKey] });
    setSeen(true);
  }

  if (seen !== false) return null;

  return (
    <div className="bg-accent-muted border border-accent/30 rounded-lg px-4 py-3 mb-3 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-ink-muted mt-0.5">{body}</p>
      </div>
      <button type="button" onClick={() => void dismiss()} className="text-ink-faint hover:text-ink shrink-0" aria-label="Dismiss tutorial">
        <X size={14} />
      </button>
    </div>
  );
}
