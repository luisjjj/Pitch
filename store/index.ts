import { create } from "zustand";
import { User, DebateRoom, DebateCategory } from "@/types";

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  currentDebate: DebateRoom | null;
  setCurrentDebate: (debate: DebateRoom | null) => void;
  categories: DebateCategory[];
  setCategories: (categories: DebateCategory[]) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  currentDebate: null,
  setCurrentDebate: (debate) => set({ currentDebate: debate }),
  categories: [],
  setCategories: (categories) => set({ categories }),
  isDarkMode: true,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));
