interface RatingBadgeProps {
  rating: number;
  reviews: number;
}

export default function RatingBadge({ rating, reviews }: RatingBadgeProps) {
  return (
    <div className="bg-white/90 dark:bg-slate-900/80 rounded-full px-3 py-1 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow border border-slate-200 dark:border-slate-700">
      {rating.toFixed(1)} <span className="text-xs font-normal text-slate-500 dark:text-slate-300">({reviews})</span>
    </div>
  );
}
