import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useChat } from '@/hooks/useChat'
import { ChatView } from '@/components/chat/ChatView'
import { HeroView } from '@/components/chat/HeroView'
import { StreamingDebug } from '@/components/debug/StreamingDebug'

export function ChatPage() {
  const { currentConversationId, viewMode, isThinking } = useAppStore()

  const chatHook = useChat(currentConversationId)
  const {
    conversation,
    isLoadingConversation,
    isStreaming,
    streamingMessage,
    thinkingSteps,
    thinkingComplete,
    isSending,
  } = chatHook

  useEffect(() => {
    console.log('🔥 ChatPage - DATA CHANGED:', {
      conversationId: currentConversationId,
      viewMode,
      isStreaming,
      streamingMessageLength: streamingMessage.length,
      thinkingStepsCount: thinkingSteps.length,
    })
  }, [currentConversationId, viewMode, isStreaming, streamingMessage, thinkingSteps])

  if (viewMode === 'hero' || !currentConversationId) {
    return <HeroView />
  }

  return (
    <>
      <ChatView
        conversation={conversation}
        isLoading={isLoadingConversation}
        isStreaming={isStreaming}
        streamingMessage={streamingMessage}
        thinkingSteps={thinkingSteps}
      />

      {/* 🔥 DEBUG OVERLAY (now receives props, no useChat inside) */}
      <StreamingDebug
        isThinking={isThinking}
        isStreaming={isStreaming}
        isSending={isSending}
        thinkingStepsCount={thinkingSteps.length}
        thinkingComplete={thinkingComplete}
        streamingMessagePreview={streamingMessage}
      />
    </>
  )
}