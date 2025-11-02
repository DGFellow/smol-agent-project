import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useConversation } from '@/hooks/useConversations'
import { HeroView } from '@/components/chat/HeroView'
import { ChatView } from '@/components/chat/ChatView'

export function ChatPage() {
  const { viewMode, currentConversationId, setViewMode } = useAppStore()
  const { user } = useAuthStore()
  const { conversation, isLoading } = useConversation(currentConversationId)

  // Switch to chat view when conversation exists
  useEffect(() => {
    if (currentConversationId && viewMode === 'hero') {
      // Small delay for smooth transition
      const timer = setTimeout(() => setViewMode('chat'), 50)
      return () => clearTimeout(timer)
    }
  }, [currentConversationId, viewMode, setViewMode])

  // Reset to hero if no conversation
  useEffect(() => {
    if (!currentConversationId && viewMode === 'chat') {
      setViewMode('hero')
    }
  }, [currentConversationId, viewMode, setViewMode])

  return (
    <div className="chat-container flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 md:px-8 py-8">
      {viewMode === 'hero' ? (
        <HeroView user={user} />
      ) : (
        <ChatView conversation={conversation} isLoading={isLoading} />
      )}
    </div>
  )
}