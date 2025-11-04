// src/components/chat/MessageRenderer.tsx
/**
 * MessageRenderer - Handles word-by-word streaming animation
 * Separates streaming logic from MessageBubble
 */

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MarkdownContent } from './MarkdownContent'

interface MessageRendererProps {
  content: string
  isStreaming?: boolean
  onStreamComplete?: () => void
}

export function MessageRenderer({ 
  content, 
  isStreaming = false,
  onStreamComplete 
}: MessageRendererProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!isStreaming) {
      // Not streaming - show full content immediately
      setDisplayedContent(content)
      setCurrentIndex(content.length)
      return
    }

    // Streaming mode - show word by word
    if (currentIndex === 0) {
      setDisplayedContent('')
    }

    const words = content.split(/(\s+)/) // Keep whitespace
    
    if (currentIndex < words.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayedContent(prev => prev + words[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, 80) // 80ms per word = ~750 WPM (readable)
    } else if (currentIndex === words.length) {
      // Streaming complete
      onStreamComplete?.()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [content, currentIndex, isStreaming, onStreamComplete])

  // Reset when content changes
  useEffect(() => {
    if (isStreaming) {
      setCurrentIndex(0)
      setDisplayedContent('')
    }
  }, [content, isStreaming])

  return (
    <div className="text-white/90 text-[15px] leading-relaxed">
      {isStreaming ? (
        <>
          {/* Raw text during streaming (no markdown parsing) */}
          <div className="whitespace-pre-wrap">{displayedContent}</div>
          {/* Blinking cursor */}
          <motion.span
            className="inline-block w-2 h-4 bg-green-400 ml-1 rounded-sm"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </>
      ) : (
        /* Full markdown rendering when complete */
        <MarkdownContent content={content} />
      )}
    </div>
  )
}