// Header.tsx
import { Menu } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useChat } from '@/hooks/useChat'
import { StatusIndicator } from '@/components/ui/StatusIndicator'

export function Header() {
  const { toggleSidebar, currentConversationId, viewMode } = useAppStore()
  const { conversation } = useChat(currentConversationId)

  // Only show title when in chat view and conversation exists
  const showTitle = viewMode === 'chat' && conversation && conversation.title

  return (
    <header className="site-header bg-transparent">
      <div className="site-header-content">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-200" />
          </button>
          
          {showTitle && (
            <h1 className="conv-title text-gray-200 text-base font-bold tracking-tight">
              {conversation.title}
            </h1>
          )}
        </div>
        
        <StatusIndicator />
      </div>
    </header>
  )
}