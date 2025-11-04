// src/pages/ChatPage.tsx
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useChat } from '@/hooks/useChat'
import { ChatView } from '@/components/chat/ChatView'
import { HeroView } from '@/components/chat/HeroView'

export function ChatPage() {
  const { currentConversationId, viewMode } = useAppStore()
  const { conversation, isLoadingConversation } = useChat(currentConversationId)

  useEffect(() => {
    console.log('ChatPage - conversationId:', currentConversationId)
    console.log('ChatPage - viewMode:', viewMode)
  }, [currentConversationId, viewMode])

  // Show hero view when no conversation
  if (viewMode === 'hero' || !currentConversationId) {
    return <HeroView />
  }

  // Show chat view when conversation exists
  return <ChatView conversation={conversation} isLoading={isLoadingConversation} />
}