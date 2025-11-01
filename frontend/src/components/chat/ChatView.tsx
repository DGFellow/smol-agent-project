import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import type { Conversation } from '@/types'

interface ChatViewProps {
  conversation: Conversation | null
  isLoading: boolean
}

export function ChatView({ conversation, isLoading }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No conversation selected</p>
      </div>
    )
  }

  return (
    <div className="chat-interface flex-1 flex flex-col bg-white rounded-xl shadow-medium overflow-hidden">
      {/* Messages Area */}
      <div className="messages flex-1 overflow-y-auto p-6 bg-gray-50 scrollbar-thin">
        <MessageList messages={conversation.messages || []} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area bg-gray-50 border-t border-gray-200 p-4">
        <MessageComposer
          placeholder="Ask anything..."
          conversationId={conversation.id}
        />
      </div>
    </div>
  )
}