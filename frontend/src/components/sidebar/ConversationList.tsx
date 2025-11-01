import { Download, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useConversationActions } from '@/hooks/useConversations'
import { formatDate, truncate } from '@/lib/utils'
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

  const handleExport = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    // TODO: Implement export functionality
    alert('Export feature coming soon!')
  }

  return (
    <div className="conversation-list space-y-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => loadConversation(conv.id)}
          className={cn(
            'conversation-item group relative',
            'p-3 rounded-lg border border-gray-200 bg-white',
            'cursor-pointer transition-all duration-200',
            'hover:bg-gray-50 hover:border-primary-300',
            currentConversationId === conv.id && 'bg-primary-50 border-primary-500'
          )}
        >
          <div className="conversation-item-header flex justify-between items-start mb-1">
            <span
              className={cn(
                'conversation-title font-semibold text-sm',
                'truncate max-w-[180px]',
                currentConversationId === conv.id
                  ? 'text-primary-700'
                  : 'text-gray-900'
              )}
            >
              {conv.title || 'Untitled'}
            </span>
            <span className="conversation-date text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatDate(conv.updated_at)}
            </span>
          </div>

          {conv.preview && (
            <p className="conversation-preview text-xs text-gray-600 truncate">
              {truncate(conv.preview, 60)}
            </p>
          )}

          {/* Action buttons - show on hover */}
          <div
            className={cn(
              'conversation-actions absolute top-2 right-2',
              'flex gap-1 opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200'
            )}
          >
            <button
              onClick={(e) => handleExport(e, conv.id)}
              className="conversation-export p-1.5 rounded bg-primary-500 hover:bg-primary-600 text-white transition-colors"
              title="Export"
              aria-label="Export conversation"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className="conversation-delete p-1.5 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="Delete"
              aria-label="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}