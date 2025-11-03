import { useState } from 'react'
import { Search, Trash2, Edit2, X } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export function ConversationList() {
  const { 
    conversations, 
    searchQuery, 
    setSearchQuery, 
    searchResults,
    deleteConversation,
    updateTitle,
  } = useChat()
  
  const { currentConversationId, setCurrentConversationId } = useAppStore()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const displayConversations = searchQuery.trim() ? searchResults : conversations

  const handleSelect = (id: number) => {
    setCurrentConversationId(id)
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      deleteConversation(id)
    }
  }

  const handleStartEdit = (e: React.MouseEvent, id: number, currentTitle: string) => {
    e.stopPropagation()
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleSaveEdit = (id: number) => {
    if (editTitle.trim()) {
      updateTitle({ id, title: editTitle.trim() })
      setEditingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="conversation-list-container flex flex-col h-full">
      {/* Search bar */}
      <div className="search-container p-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </div>
        
        {/* Search results count */}
        {searchQuery && (
          <div className="text-xs text-gray-500 mt-1 px-1">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Conversations list */}
      <div className="conversation-list flex-1 overflow-y-auto p-2 space-y-2">
        {displayConversations.length === 0 ? (
          <div className="conversation-empty py-8 px-4 text-center text-gray-500 text-sm">
            {searchQuery ? (
              <>
                <p className="font-medium">No conversations found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <p className="font-medium">No conversations yet</p>
                <p className="text-xs mt-1">Start a new conversation to get started</p>
              </>
            )}
          </div>
        ) : (
          displayConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={cn(
                'conversation-item group p-3 rounded-lg border cursor-pointer transition-all',
                currentConversationId === conv.id
                  ? 'bg-primary-50 border-primary-500'
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-primary-300'
              )}
            >
              {/* Header */}
              <div className="conversation-item-header flex justify-between items-start mb-1">
                {editingId === conv.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(conv.id)
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    onBlur={() => handleSaveEdit(conv.id)}
                    className="flex-1 text-sm font-semibold border border-primary-500 rounded px-2 py-1 focus:outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3 className="conversation-title font-semibold text-sm text-gray-900 truncate flex-1">
                    {conv.title}
                  </h3>
                )}
                
                <span className="conversation-date text-xs text-gray-500 ml-2 flex-shrink-0">
                  {formatDate(conv.updated_at || conv.created_at)}
                </span>
              </div>

              {/* Preview */}
              {conv.preview && (
                <p className="conversation-preview text-xs text-gray-600 truncate">
                  {conv.preview}
                </p>
              )}

              {/* Message count */}
              <div className="text-xs text-gray-400 mt-1">
                {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
              </div>

              {/* Actions */}
              <div className="conversation-actions absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleStartEdit(e, conv.id, conv.title)}
                  className="conversation-edit w-6 h-6 rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center transition-colors"
                  title="Edit title"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="conversation-delete w-6 h-6 rounded bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}