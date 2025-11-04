// src/components/chat/MessageActions.tsx
/**
 * MessageActions - Action buttons for messages
 * - User messages: Edit, Copy
 * - Assistant messages: Copy, Regenerate, Like/Dislike
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Edit2, RotateCw, ThumbsUp, ThumbsDown, Check } from 'lucide-react'

interface MessageActionsProps {
  messageId: number
  role: 'user' | 'assistant'
  content: string
  reaction?: 'like' | 'dislike' | null
  onCopy?: () => void
  onEdit?: () => void
  onRegenerate?: () => void
  onReact?: (reaction: 'like' | 'dislike' | null) => void
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  role,
  content,
  reaction,
  onCopy,
  onEdit,
  onRegenerate,
  onReact,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReact = (newReaction: 'like' | 'dislike') => {
    // Toggle off if clicking the same reaction
    onReact?.(reaction === newReaction ? null : newReaction)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-center gap-1 mt-2"
    >
      {/* Copy button - Always available */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
        title="Copy message"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className="w-3.5 h-3.5 text-green-400" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Copy className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* User-specific actions */}
      {role === 'user' && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
          title="Edit message"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Assistant-specific actions */}
      {role === 'assistant' && (
        <>
          <button
            onClick={onRegenerate}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
            title="Regenerate response"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Reaction buttons */}
          <div className="flex items-center gap-0.5 ml-1 border-l border-white/10 pl-1">
            <button
              onClick={() => handleReact('like')}
              className={`p-1.5 rounded-md transition-all ${
                reaction === 'like'
                  ? 'bg-green-500/20 text-green-400'
                  : 'hover:bg-white/10 text-white/60 hover:text-white'
              }`}
              title="Like"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleReact('dislike')}
              className={`p-1.5 rounded-md transition-all ${
                reaction === 'dislike'
                  ? 'bg-red-500/20 text-red-400'
                  : 'hover:bg-white/10 text-white/60 hover:text-white'
              }`}
              title="Dislike"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}