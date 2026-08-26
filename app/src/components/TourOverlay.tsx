import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui";
import { TOUR_STEPS } from "../services/tour/tourSteps";

export function TourOverlay({ onFinish }: { onFinish: () => void }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];

  useEffect(() => {
    navigate(step.path);
  }, [navigate, step.path]);

  function next() {
    if (index < TOUR_STEPS.length - 1) setIndex((current) => current + 1);
    else onFinish();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-8 animate-in fade-in duration-200">
      <div className="max-w-xl w-full text-center animate-in fade-in slide-in-from-bottom-2 duration-300" key={index}>
        <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">{index + 1} / {TOUR_STEPS.length}</p>
        <h2 className="text-3xl font-semibold text-white leading-tight">{step.title}</h2>
        <p className="text-white/80 mt-4 text-base leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button variant="secondary" onClick={onFinish}>Skip</Button>
          <Button onClick={next}>{index === TOUR_STEPS.length - 1 ? "Done" : "Next"}</Button>
        </div>
      </div>
    </div>
  );
}