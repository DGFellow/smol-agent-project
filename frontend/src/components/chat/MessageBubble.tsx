// src/components/chat/MessageBubble.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
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
  };
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isStreaming = false
}) => {
  const isUser = message.role === 'user';

  // Animation variants
  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={messageVariants}
      className={`message-row w-full py-6 ${
        isUser ? 'bg-transparent' : 'bg-white/5'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
              : 'bg-gradient-to-br from-green-500 to-green-600'
          }`}>
            {isUser ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="font-semibold text-white mb-2 text-sm">
            {isUser ? 'You' : 'Assistant'}
          </div>

          {/* Thinking Indicator (only for assistant) */}
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
          </div>

          {/* Streaming Cursor */}
          {isStreaming && !isUser && (
            <motion.span
              className="inline-block w-2 h-4 bg-white/50 ml-1"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};