import { Star } from "lucide-react";

interface StarRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  size?: number;
}

export function StarRating({ value = 0, onChange, size = 16 }: StarRatingProps) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
        >
          <Star size={size} className={star <= value ? "fill-accent text-accent" : "text-border"} />
        </button>
      ))}
    </div>
  );
}