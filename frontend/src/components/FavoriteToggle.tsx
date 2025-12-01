import { Heart } from "lucide-react";
import { useFavorites } from "../store/useFavorites";

interface FavoriteToggleProps {
  id: string;
}

export default function FavoriteToggle({ id }: FavoriteToggleProps) {
  const { ids, toggle } = useFavorites();
  const isActive = ids.includes(id);

  return (
    <button
      onClick={() => toggle(id)}
      className={`p-2 rounded-full bg-white/90 shadow ${
        isActive ? "text-rose-500" : "text-slate-400"
      } transition hover:scale-105`}
    >
      <Heart className={isActive ? "fill-rose-500" : ""} />
    </button>
  );
}
