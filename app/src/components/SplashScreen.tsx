import { useEffect, useState } from "react";
import { LogoMark } from "./LogoMark";

const LOADING_MESSAGES = ["Loading your data...", "Checking habits...", "Syncing tasks...", "Almost there..."];

export function SplashScreen() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setMsgIndex((index) => (index + 1) % LOADING_MESSAGES.length), 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-surface-sunken flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
        <LogoMark size={36} />
      </div>
      <p className="text-sm font-medium text-ink tracking-wide">Lock In</p>
      <div className="w-32 h-1 rounded-full bg-surface-raised overflow-hidden">
        <div className="h-full w-1/3 bg-accent rounded-full animate-[loading_1.2s_ease-in-out_infinite]" />
      </div>
      <p className="text-xs text-ink-faint mt-1 h-4">{LOADING_MESSAGES[msgIndex]}</p>
    </div>
  );
}