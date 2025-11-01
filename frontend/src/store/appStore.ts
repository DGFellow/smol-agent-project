import { create } from 'zustand'
import type { ViewMode } from '@/types'

interface AppState {
  // UI State
  viewMode: ViewMode
  sidebarExpanded: boolean
  currentConversationId: number | null
  
  // Loading states
  isThinking: boolean
  
  // Actions
  setViewMode: (mode: ViewMode) => void
  setSidebarExpanded: (expanded: boolean) => void
  toggleSidebar: () => void
  setCurrentConversationId: (id: number | null) => void
  setThinking: (thinking: boolean) => void
  resetToHero: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  viewMode: 'hero',
  sidebarExpanded: false,
  currentConversationId: null,
  isThinking: false,

  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  
  toggleSidebar: () =>
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  
  setThinking: (thinking) => set({ isThinking: thinking }),
  
  resetToHero: () =>
    set({
      viewMode: 'hero',
      currentConversationId: null,
      isThinking: false,
    }),
}))