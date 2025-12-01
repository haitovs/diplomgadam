interface RatingBadgeProps {
  rating: number;
  reviews: number;
}

export default function RatingBadge({ rating, reviews }: RatingBadgeProps) {
  return (
    <div className="bg-white/90 rounded-full px-3 py-1 text-sm font-semibold text-slate-800 shadow">
      {rating.toFixed(1)} <span className="text-xs font-normal text-slate-500">({reviews})</span>
    </div>
  );
}
