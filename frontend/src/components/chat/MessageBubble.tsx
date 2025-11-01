import { Bot, User } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'message-bubble animate-fade-in',
        isUser ? 'message-user ml-auto max-w-[80%]' : 'message-assistant mr-auto max-w-[80%]'
      )}
    >
      {/* Message Label */}
      <div className="message-label flex items-center gap-2 mb-2 text-sm font-semibold">
        {isUser ? (
          <>
            <User className="w-4 h-4" />
            <span>You</span>
          </>
        ) : (
          <>
            <Bot className="w-4 h-4" />
            <span>Assistant</span>
            {message.model && (
              <span className="text-xs font-normal text-gray-500">
                ({message.agent || 'chat'})
              </span>
            )}
          </>
        )}
      </div>

      {/* Message Content */}
      <div className={cn('text-sm leading-relaxed', isUser ? 'text-white' : 'text-gray-900')}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  )
}