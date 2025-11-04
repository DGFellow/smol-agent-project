// src/store/appStore.ts
import { create } from 'zustand'

type ViewMode = 'hero' | 'chat' | 'projects' | 'settings'

interface AppState {
  // Sidebar
  sidebarExpanded: boolean
  setSidebarExpanded: (expanded: boolean) => void
  toggleSidebar: () => void
  
  // Current conversation
  currentConversationId: number | null
  setCurrentConversationId: (id: number | null) => void
  
  // View mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  
  // Thinking state
  isThinking: boolean
  setThinking: (thinking: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar state
  sidebarExpanded: false,
  setSidebarExpanded: (expanded) => {
    console.log('📱 Setting sidebar expanded:', expanded)
    set({ sidebarExpanded: expanded })
  },
  toggleSidebar: () => set((state) => {
    console.log('📱 Toggling sidebar:', !state.sidebarExpanded)
    return { sidebarExpanded: !state.sidebarExpanded }
  }),
  
  // Conversation state
  currentConversationId: null,
  setCurrentConversationId: (id) => {
    console.log('💬 Setting conversation ID:', id)
    set({ 
      currentConversationId: id,
      viewMode: id ? 'chat' : 'hero'
    })
  },
  
  // View mode
  viewMode: 'hero',
  setViewMode: (mode) => {
    console.log('👁️ Setting view mode:', mode)
    set({ viewMode: mode })
  },
  
  // Thinking state
  isThinking: false,
  setThinking: (thinking) => {
    console.log('🧠 Setting thinking state:', thinking)
    set({ isThinking: thinking })
  },
}))