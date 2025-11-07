// src/components/chat/MessageRenderer.tsx - FIXED
import { motion } from 'framer-motion'
import { MarkdownContent } from './MarkdownContent'

interface MessageRendererProps {
  content: string
  isStreaming?: boolean
}

export function MessageRenderer({ 
  content, 
  isStreaming = false
}: MessageRendererProps) {

  return (
    <div className="text-white/90 text-[15px] leading-relaxed">
      {isStreaming ? (
        <div className="flex items-start gap-1">
          {/* Raw text during streaming (no markdown parsing for performance) */}
          <span className="whitespace-pre-wrap">{content}</span>
          
          {/* Blinking cursor */}
          <motion.span
            className="inline-block w-[2px] h-5 bg-blue-400 rounded-sm flex-shrink-0"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ 
              duration: 0.8, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      ) : (
        /* Full markdown rendering when complete */
        <MarkdownContent content={content} />
      )}
    </div>
  )
}