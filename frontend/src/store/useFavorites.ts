import { create } from "zustand";

type FavoriteState = {
  ids: string[];
  toggle: (id: string) => void;
};

const storageKey = "ashgabat-favorites";

const getInitial = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const useFavorites = create<FavoriteState>((set, get) => ({
  ids: getInitial(),
  toggle: (id) =>
    set((state) => {
      const exists = state.ids.includes(id);
      const next = exists ? state.ids.filter((item) => item !== id) : [...state.ids, id];
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return { ids: next };
    })
}));
