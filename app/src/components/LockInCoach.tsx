import { useCoach } from "../services/coach/CoachContext";

export function LockInCoach() {
  const { message, dismiss } = useCoach();
  if (!message) return null;

  const toneStyles = {
    hype: "border-success bg-success/10",
    nudge: "border-accent bg-accent-muted",
    warning: "border-danger bg-danger/10",
  }[message.tone];

  return (
    <div className="fixed bottom-24 right-6 z-40 flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2">
      <div className={`max-w-xs px-3 py-2 rounded-xl border text-sm text-ink ${toneStyles}`}>
        {message.text}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-2xl shrink-0 shadow-lg"
        title="Lock In Coach"
        aria-label="Dismiss Lock In Coach"
      >
        <span aria-hidden="true">💪</span>
      </button>
    </div>
  );
}