import { Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useConversationActions } from '@/hooks/useConversations'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'

interface ConversationListProps {
  conversations: Conversation[]
}

export function ConversationList({ conversations }: ConversationListProps) {
  const { currentConversationId } = useAppStore()
  const { loadConversation, deleteConversation } = useConversationActions()

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      deleteConversation(id)
    }
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv) => {
        const isActive = currentConversationId === conv.id
        
        return (
          <div
            key={conv.id}
            onClick={() => loadConversation(conv.id)}
            className={cn(
              'group relative px-3 py-2 rounded-lg cursor-pointer transition-all',
              isActive
                ? 'bg-gray-800 text-white'
                : 'hover:bg-gray-800 text-gray-300 hover:text-white'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isActive ? 'text-white' : 'text-gray-200'
                )}>
                  {conv.title || 'Untitled'}
                </p>
                {conv.preview && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {truncate(conv.preview, 40)}
                  </p>
                )}
              </div>
              
              {/* Delete button - shows on hover */}
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className={cn(
                  'flex-shrink-0 p-1 rounded hover:bg-red-500/20 transition-opacity',
                  'opacity-0 group-hover:opacity-100'
                )}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}