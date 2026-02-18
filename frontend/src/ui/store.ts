import { create } from 'zustand'

type AppState = {
  globalQuery: string
  setGlobalQuery: (v: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  globalQuery: '',
  setGlobalQuery: (v) => set({ globalQuery: v }),
}))
