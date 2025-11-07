// frontend/src/components/chat/MessageList.tsx - UPDATED
import { MessageBubble } from './MessageBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import { MessageRenderer } from './MessageRenderer'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  conversationId: number
  streamingMessage?: string
  isStreaming?: boolean
  thinkingSteps?: Array<{ content: string; step: number; timestamp: number }>
  isThinking?: boolean
  thinkingComplete?: boolean
  thinkingDuration?: number
}

export function MessageList({
  messages,
  conversationId,
  streamingMessage = '',
  isStreaming = false,
  thinkingSteps = [],
  isThinking = false,
  thinkingComplete = false,
  thinkingDuration
}: MessageListProps) {
  return (
    <div className="space-y-6">
      {/* Render saved messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          conversationId={conversationId}
        />
      ))}

      {/* Show thinking indicator */}
      {(isThinking || thinkingSteps.length > 0) && (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">AI</span>
          </div>
          <div className="flex-1">
            <ThinkingIndicator
              steps={thinkingSteps}
              isComplete={thinkingComplete}
              duration={thinkingDuration}
            />
          </div>
        </div>
      )}

      {/* Show streaming response */}
      {isStreaming && streamingMessage && (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">AI</span>
          </div>
          <div className="flex-1 bg-gray-800/50 backdrop-blur-sm rounded-2xl px-5 py-4 border border-gray-700/50">
            <MessageRenderer
              content={streamingMessage}
              isStreaming={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}