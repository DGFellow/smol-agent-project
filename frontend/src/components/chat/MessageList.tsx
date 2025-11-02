import { MessageBubble } from './MessageBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import { useAppStore } from '@/store/appStore'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const isThinking = useAppStore((state) => state.isThinking)

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No messages yet. Start a conversation!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {/* Show thinking indicator when waiting for response */}
      {isThinking && <ThinkingIndicator />}
    </div>
  )
}