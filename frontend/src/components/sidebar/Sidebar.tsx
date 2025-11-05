// src/components/sidebar/Sidebar.tsx
import { useEffect } from 'react'
import { Menu, MessageSquarePlus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useChat } from '@/hooks/useChat'
import { ConversationList } from './ConversationList'
import { AccountButton } from './AccountButton'
import { getInitials, cn } from '@/lib/utils'

export function Sidebar() {
  // ✅ FIX: Select each value separately to avoid object reference issues
  const sidebarExpanded = useAppStore((state) => state.sidebarExpanded)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const setSidebarExpanded = useAppStore((state) => state.setSidebarExpanded)
  const setCurrentConversationId = useAppStore((state) => state.setCurrentConversationId)
  const setViewMode = useAppStore((state) => state.setViewMode)
  
  const user = useAuthStore((state) => state.user)
  
  const { conversations, isLoadingConversations: isLoading } = useChat()
  
  const startNewConversation = () => {
    setCurrentConversationId(null)
    setViewMode('hero')
    if (!sidebarExpanded) {
      setSidebarExpanded(true)
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarExpanded) {
        setSidebarExpanded(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarExpanded, setSidebarExpanded])

  return (
    <>
      {/* Overlay for mobile/tablet only */}
      {sidebarExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarExpanded(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={cn(
          'fixed md:relative',
          'top-0 h-screen z-50 md:z-auto',
          'bg-gray-900 text-white flex flex-col',
          'transition-all duration-300 ease-in-out',
          'border-r border-white/10',
          // Width: Thicker as requested
          sidebarExpanded ? 'w-72' : 'w-16',
          // Mobile: slide in/out
          'md:translate-x-0',
          sidebarExpanded ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Collapsed state */}
        {!sidebarExpanded && (
          <div className="flex flex-col items-center gap-4 py-4 h-full">
            {/* Toggle button - FIXED: Added z-index and pointer-events */}
            <button
              onClick={toggleSidebar}
              className="relative z-10 p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <button
              onClick={startNewConversation}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>
            
            <div className="flex-1" />
            
            {user && (
              <button
                onClick={toggleSidebar}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                title="Open sidebar"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white flex items-center justify-center font-bold text-xs">
                  {getInitials(user.username)}
                </div>
              </button>
            )}
          </div>
        )}

        {/* Expanded state */}
        {sidebarExpanded && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="text-base font-semibold px-2">Smolagent</span>
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Collapse sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3 border-b border-white/10">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <MessageSquarePlus className="w-5 h-5" />
                <span className="text-sm font-medium">New chat</span>
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin">
              {isLoading ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-gray-400 py-8 px-4">
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a new chat to begin</p>
                </div>
              ) : (
                <ConversationList />
              )}
            </div>

            {/* Account Button */}
            <div className="p-3 border-t border-white/10">
              <AccountButton />
            </div>
          </>
        )}
      </div>
    </>
  )
}