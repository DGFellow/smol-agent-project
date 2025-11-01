import { useConversations } from '@/hooks/useConversations'
import { ConversationList } from './ConversationList'
import { Loader2 } from 'lucide-react'

export function SidebarPanel() {
  const { conversations, isLoading } = useConversations({ limit: 50 })

  return (
    <div className="sidebar-panel flex flex-col bg-white">
      <div className="sidebar-content flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="conversation-empty text-center py-12 px-4">
            <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No conversations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <ConversationList conversations={conversations} />
        )}
      </div>
    </div>
  )
}