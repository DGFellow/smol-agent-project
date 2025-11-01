import { Menu } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useConversation } from '@/hooks/useConversations'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { cn } from '@/lib/utils'

export function Header() {
  const { toggleSidebar, currentConversationId } = useAppStore()
  const { conversation } = useConversation(currentConversationId)

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
          
          <h1
            className={cn(
              'conv-title transition-opacity duration-200',
              conversation?.title ? 'opacity-100' : 'opacity-0'
            )}
          >
            {conversation?.title || 'Untitled'}
          </h1>
        </div>
        
        <StatusIndicator />
      </div>
    </header>
  )
}