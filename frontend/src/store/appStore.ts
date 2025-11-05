// src/store/appStore.ts
import { create } from 'zustand'

type ViewMode = 'hero' | 'chat' | 'projects' | 'settings'

interface ThinkingStep {
  content: string
  step: number
  timestamp: number
}

interface StreamingState {
  streamingMessage: string
  thinkingSteps: ThinkingStep[]
  thinkingComplete: boolean
  thinkingDuration?: number
}

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
  
  // Thinking state (deprecated - use isStreaming instead)
  isThinking: boolean
  setThinking: (thinking: boolean) => void
  
  // ✨ NEW: Global streaming flags (lifecycle-stable)
  isStreaming: boolean
  isSending: boolean
  setIsStreaming: (value: boolean) => void
  setIsSending: (value: boolean) => void
  
  // ✨ NEW: Streaming state by conversation (keyed storage)
  streamingByConv: Record<number | 'pending', StreamingState>
  upsertStreamingState: (
    convId: number | 'pending',
    patch: Partial<StreamingState> | ((prev: StreamingState) => StreamingState)
  ) => void
  clearStreamingState: (convId: number | 'pending') => void
  migrateStreamingState: (fromKey: 'pending', toKey: number) => void
}

const emptyStreamingState: StreamingState = {
  streamingMessage: '',
  thinkingSteps: [],
  thinkingComplete: false,
  thinkingDuration: undefined,
}

export const useAppStore = create<AppState>((set, get) => ({
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
  
  // Thinking state (legacy)
  isThinking: false,
  setThinking: (thinking) => {
    console.log('🧠 Setting thinking state:', thinking)
    set({ isThinking: thinking })
  },
  
  // ✨ NEW: Global streaming flags
  isStreaming: false,
  isSending: false,
  setIsStreaming: (value) => {
    console.log('🔥🔥🔥 STORE: Setting isStreaming to', value)
    set({ isStreaming: value })
  },
  setIsSending: (value) => {
    console.log('📤 STORE: Setting isSending to', value)
    set({ isSending: value })
  },
  
  // ✨ NEW: Streaming state storage
  streamingByConv: {},
  
  upsertStreamingState: (convId, patch) => {
    set((state) => {
      const existing = state.streamingByConv[convId] || emptyStreamingState
      const updated = typeof patch === 'function' 
        ? patch(existing)
        : { ...existing, ...patch }
      
      return {
        streamingByConv: {
          ...state.streamingByConv,
          [convId]: updated,
        },
      }
    })
  },
  
  clearStreamingState: (convId) => {
    set((state) => {
      const { [convId]: _, ...rest } = state.streamingByConv
      return { streamingByConv: rest }
    })
  },
  
  migrateStreamingState: (fromKey, toKey) => {
    const state = get()
    const pendingState = state.streamingByConv[fromKey]
    
    if (pendingState) {
      console.log('🔄 Migrating streaming state from', fromKey, 'to', toKey)
      set((state) => {
        const { [fromKey]: _, ...rest } = state.streamingByConv
        return {
          streamingByConv: {
            ...rest,
            [toKey]: pendingState,
          },
        }
      })
    }
  },
}))