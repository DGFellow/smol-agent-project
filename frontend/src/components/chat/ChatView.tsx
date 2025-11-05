// FIXED: Accept props instead of calling useChat
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { MessageList } from './MessageList'
import type { Conversation } from '@/types'

interface ChatViewProps {
  conversation: Conversation | null
  isLoading: boolean
  isStreaming: boolean
  streamingMessage: string
  thinkingSteps: Array<{ content: string; step: number; timestamp: number }>
}

export function ChatView({
  conversation,
  isLoading,
  isStreaming,
  streamingMessage,
  thinkingSteps,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conversation?.messages?.length, streamingMessage, thinkingSteps.length])

  // Initial scroll when conversation loads
  useEffect(() => {
    if (conversation?.id) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
      }, 100)
    }
  }, [conversation?.id])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <p className="text-white/70 text-sm">Loading conversation...</p>
        </motion.div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/70">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-lg">No conversation selected</p>
          <p className="text-sm text-white/50 mt-2">Select a conversation or start a new one</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {conversation.messages && conversation.messages.length > 0 ? (
            <MessageList
              messages={conversation.messages}
              conversationId={conversation.id}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
              thinkingSteps={thinkingSteps}
            />
          ) : (
            <div className="text-center text-white/50 py-12">
              <p className="text-lg">Start the conversation...</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
}