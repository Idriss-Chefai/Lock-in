import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface CoachMessage {
  text: string;
  tone: "hype" | "nudge" | "warning";
}

interface CoachContextValue {
  message: CoachMessage | null;
  push: (text: string, tone?: CoachMessage["tone"]) => void;
  dismiss: () => void;
}

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<CoachMessage | null>(null);

  const push = useCallback((text: string, tone: CoachMessage["tone"] = "nudge") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage((message) => (message?.text === text ? null : message)), 6000);
  }, []);

  const dismiss = useCallback(() => setMessage(null), []);

  return <CoachContext.Provider value={{ message, push, dismiss }}>{children}</CoachContext.Provider>;
}

export function useCoach() {
  const context = useContext(CoachContext);
  if (!context) throw new Error("useCoach must be used within CoachProvider");
  return context;
}