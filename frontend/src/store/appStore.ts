import { create } from 'zustand'

type ViewMode = 'hero' | 'chat'

interface AppState {
  // View state
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  
  // Current conversation
  currentConversationId: number | null
  setCurrentConversationId: (id: number | null) => void
  
  // Thinking state
  isThinking: boolean
  setThinking: (thinking: boolean) => void
  
  // Sidebar state
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Reset to initial state
  reset: () => void
}

const initialState = {
  viewMode: 'hero' as ViewMode,
  currentConversationId: null,
  isThinking: false,
  isSidebarOpen: true,
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  
  setThinking: (thinking) => set({ isThinking: thinking }),
  
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  reset: () => set(initialState),
}))