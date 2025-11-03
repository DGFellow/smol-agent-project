// src/components/chat/MessageList.tsx
import { MessageBubble } from './MessageBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import { useAppStore } from '@/store/appStore'
import { useChat } from '@/hooks/useChat'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  conversationId?: number
}

export function MessageList({ messages, conversationId }: MessageListProps) {
  const isThinking = useAppStore((state) => state.isThinking)
  const { thinkingSteps, thinkingComplete, thinkingDuration } = useChat(conversationId)

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No messages yet. Start a conversation!</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
        />
      ))}
      
      {/* Show thinking indicator when waiting for response */}
      {isThinking && (
        <ThinkingIndicator 
          steps={thinkingSteps} 
          isComplete={thinkingComplete} 
          duration={thinkingDuration} 
        />
      )}
    </div>
  )
}