import { useEffect } from 'react'
import { Menu, X, MessageSquarePlus, MessageSquare } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useConversations, useConversationActions } from '@/hooks/useConversations'
import { ConversationList } from './ConversationList'
import { AccountButton } from './AccountButton'
import { getInitials, cn } from '@/lib/utils'

export function Sidebar() {
  // FIX: Use correct state property names from appStore
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore()
  const { user } = useAuthStore()
  const { startNewConversation } = useConversationActions()
  const { conversations, isLoading } = useConversations({ limit: 50 })

  // Close sidebar on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isSidebarOpen, setSidebarOpen])

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={cn(
          'fixed lg:sticky top-0 h-screen z-50 lg:z-auto',
          'bg-gray-900 text-white flex flex-col',
          'transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'w-64' : 'w-0 lg:w-12',
          'lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Toggle button - always visible on desktop */}
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-2 hover:bg-gray-800 rounded-lg transition-colors',
              !isSidebarOpen && 'lg:block hidden'
            )}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          
          {isSidebarOpen && (
            <span className="text-sm font-semibold">Smolagent</span>
          )}
        </div>

        {/* New Chat Button */}
        {isSidebarOpen && (
          <div className="p-2 border-b border-gray-700">
            <button
              onClick={startNewConversation}
              className="w-full flex items-center gap-3 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MessageSquarePlus className="w-5 h-5" />
              <span className="text-sm font-medium">New chat</span>
            </button>
          </div>
        )}

        {/* Conversations List */}
        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto py-2 px-2">
            {isLoading ? (
              <div className="text-center text-gray-400 py-8 text-sm">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-400 py-8 px-4">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <ConversationList conversations={conversations} />
            )}
          </div>
        )}

        {/* Account Button */}
        {isSidebarOpen && (
          <div className="p-2 border-t border-gray-700">
            <AccountButton />
          </div>
        )}

        {/* Collapsed state - toggle + new chat + account */}
        {!isSidebarOpen && (
          <div className="hidden lg:flex flex-col items-center gap-2 py-2 h-full">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
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
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Account avatar in collapsed mode */}
            <button
              onClick={toggleSidebar}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              title="Open sidebar for account menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white flex items-center justify-center font-bold text-xs">
                {user ? getInitials(user.first_name || user.username || 'U') : 'U'}
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  )
}