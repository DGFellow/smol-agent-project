// src/components/sidebar/ConversationList.tsx - SAFE
import { useState } from 'react'
import { Search, Trash2, Edit2, X, MessageSquare } from 'lucide-react'
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
  
  const currentConversationId = useAppStore((state) => state.currentConversationId)
  const setCurrentConversationId = useAppStore((state) => state.setCurrentConversationId)
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // ✅ SAFE: Always ensure arrays exist
  const displayConversations = searchQuery.trim() 
    ? (searchResults ?? []) 
    : (conversations ?? [])

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
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="conversation-list-container flex flex-col h-full">
      {/* Search bar */}
      <div className="search-container mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
        
        {searchQuery && (
          <div className="text-xs text-gray-500 mt-1 px-1">
            {displayConversations.length} result{displayConversations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Conversations list */}
      <div className="conversation-list flex-1 overflow-y-auto space-y-1 scrollbar-thin">
        {displayConversations.length === 0 ? (
          <div className="py-8 px-4 text-center text-gray-500 text-sm">
            {searchQuery ? (
              <>
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No conversations found</p>
                <p className="text-xs mt-1">Try a different search</p>
              </>
            ) : (
              <>
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-xs mt-1">Start chatting to begin</p>
              </>
            )}
          </div>
        ) : (
          displayConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={cn(
                'conversation-item group relative p-3 rounded-lg cursor-pointer transition-all',
                currentConversationId === conv.id
                  ? 'bg-gray-800 border border-blue-500'
                  : 'bg-gray-800/50 border border-transparent hover:bg-gray-800 hover:border-gray-700'
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-1">
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
                    className="flex-1 text-sm font-semibold bg-gray-700 border border-blue-500 rounded px-2 py-1 focus:outline-none text-white"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3 className="text-sm font-semibold text-white truncate flex-1 pr-2">
                    {conv.title}
                  </h3>
                )}
                
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {formatDate(conv.updated_at || conv.created_at)}
                </span>
              </div>

              {/* Preview */}
              {conv.preview && (
                <p className="text-xs text-gray-400 truncate mb-1">
                  {conv.preview}
                </p>
              )}

              {/* Message count */}
              <div className="text-xs text-gray-500">
                {conv.message_count || 0} message{(conv.message_count || 0) !== 1 ? 's' : ''}
              </div>

              {/* Action buttons */}
              <div 
                className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 rounded-md p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => handleStartEdit(e, conv.id, conv.title)}
                  className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                  title="Edit title"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="w-6 h-6 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
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