// src/components/chat/MessageBubble.tsx
/**
 * MessageBubble - User on RIGHT, Assistant on LEFT
 * Reactions always visible
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
        ease: [0.25, 0.46, 0.45, 0.94] as const
      }
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={messageVariants}
      className={`message-row w-full py-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-white/5'
      }`}
    >
      <div className="max-w-4xl mx-auto px-6">
        {/* USER MESSAGE - Right aligned */}
        {isUser ? (
          <div className="flex gap-4 justify-end">
            <div className="flex-1 min-w-0 flex flex-col items-end">
              <div className="font-semibold text-white text-sm mb-2">
                You
              </div>
              <div className="bg-blue-600/80 rounded-2xl px-4 py-3 max-w-[80%]">
                <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
              
              {/* Actions - Always visible */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ) : (
          /* ASSISTANT MESSAGE - Left aligned */
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm mb-2">
                Assistant
              </div>

              {/* Thinking Indicator */}
              {message.thinking && (
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
                {message.content ? (
                  <MarkdownContent content={message.content} />
                ) : null}
                
                {isStreaming && (
                  <motion.span
                    className="inline-block w-2 h-4 bg-green-400 ml-1 rounded-sm"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Actions - Always visible */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
                  title="Like"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-all"
                  title="Dislike"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};