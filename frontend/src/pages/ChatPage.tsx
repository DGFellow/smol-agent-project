import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useChat } from '@/hooks/useChat'
import { ChatView } from '@/components/chat/ChatView'
import { HeroView } from '@/components/chat/HeroView'
import { StreamingDebug } from '@/components/debug/StreamingDebug'

export function ChatPage() {
  const { 
    currentConversationId, 
    viewMode, 
    isThinking,
    isStreaming,
    isAnswering
  } = useAppStore()

  const chatHook = useChat(currentConversationId)
  const {
    conversation,
    isLoadingConversation,
    streamingMessage,
    thinkingSteps,
    thinkingComplete,
    thinkingDuration,
    isSending,
  } = chatHook

  useEffect(() => {
    console.log('📊 ChatPage State:', {
      conversationId: currentConversationId,
      viewMode,
      isThinking,
      isStreaming,
      isAnswering,
      streamingMessageLength: streamingMessage.length,
      thinkingStepsCount: thinkingSteps.length,
    })
  }, [currentConversationId, viewMode, isThinking, isStreaming, isAnswering, streamingMessage, thinkingSteps])

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
        isThinking={isThinking}
        thinkingComplete={thinkingComplete}
        thinkingDuration={thinkingDuration}
      />

      {/* 🔥 DEBUG OVERLAY */}
      {process.env.NODE_ENV === 'development' && (
        <StreamingDebug
          isThinking={isThinking}
          isStreaming={isStreaming}
          isSending={isSending}
          thinkingStepsCount={thinkingSteps.length}
          thinkingComplete={thinkingComplete}
          streamingMessagePreview={streamingMessage}
        />
      )}
    </>
  )
}