// src/components/chat/MessageBubble.tsx
/**
 * MessageBubble - Complete rewrite with animations
 * 
 * Features:
 * - Left/right alignment (Assistant left, User right)
 * - Smooth fade-in + slide-up animation
 * - Beautiful styling with proper spacing
 * - Thinking indicator integration
 * - Avatar support
 */

import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    thinking?: {
      steps: Array<{ content: string; step: number; timestamp: number }>;
      duration: number;
    };
    reaction?: 'like' | 'dislike' | null;
  };
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isStreaming = false
}) => {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = React.useState(false);

  // Animation variants for smooth entrance
  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.98
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94] // easeOutQuad
      }
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    // TODO: Show toast notification
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={messageVariants}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`message-row w-full py-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-white/5 hover:bg-white/8'
      }`}
    >
      <div className="max-w-4xl mx-auto px-6 flex gap-4">
        {/* Avatar - Always on the left */}
        <div className="flex-shrink-0">
          <motion.div 
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
              isUser 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {isUser ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-white text-sm">
              {isUser ? 'You' : 'Assistant'}
            </span>
            {!isUser && message.reaction && (
              <span className="text-xs">
                {message.reaction === 'like' ? '👍' : '👎'}
              </span>
            )}
          </div>

          {/* Thinking Indicator (only for assistant, above message) */}
          {!isUser && message.thinking && (
            <div className="mb-3">
              <ThinkingIndicator
                steps={message.thinking.steps}
                isComplete={!isStreaming}
                duration={message.thinking.duration}
              />
            </div>
          )}

          {/* Message Content */}
          <div className="text-white/90 text-[15px] leading-relaxed">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownContent content={message.content} />
            )}
            
            {/* Streaming cursor */}
            {isStreaming && !isUser && (
              <motion.span
                className="inline-block w-2 h-4 bg-green-400 ml-1 rounded-sm"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>

          {/* Action buttons - Show on hover */}
          {showActions && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3"
            >
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Copy message"
              >
                <Copy className="w-4 h-4" />
              </button>
              
              {!isUser && (
                <>
                  <button
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    title="Like"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    title="Dislike"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};