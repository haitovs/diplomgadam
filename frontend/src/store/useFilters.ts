import { create } from "zustand";
import type { PriceTier } from "../types/restaurant";

type FilterState = {
  search: string;
  cuisines: string[];
  dietary: string[];
  price: PriceTier[];
  rating: number;
  setSearch: (value: string) => void;
  toggleItem: (key: "cuisines" | "dietary" | "price", value: string) => void;
  setRating: (value: number) => void;
  reset: () => void;
};

export const useFilters = create<FilterState>((set) => ({
  search: "",
  cuisines: [],
  dietary: [],
  price: [],
  rating: 0,
  setSearch: (value) => set({ search: value }),
  toggleItem: (key, value) =>
    set((state) => {
      const list = state[key] as string[];
      const exists = list.includes(value);
      return { [key]: exists ? list.filter((item) => item !== value) : [...list, value] } as Partial<FilterState>;
    }),
  setRating: (value) => set({ rating: value }),
  reset: () => set({ search: "", cuisines: [], dietary: [], price: [], rating: 0 })
}));
