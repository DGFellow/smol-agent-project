// src/components/chat/MessageList.tsx
/**
 * MessageList - Renders list of messages with staggered animations
 * 
 * Features:
 * - Staggered entrance animations for messages
 * - Handles thinking indicator display
 * - Empty state handling
 * - Smooth scroll behavior
 */

import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { useAppStore } from '@/store/appStore';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  conversationId?: number;
  streamingMessage?: string;    // ⬅️ ADD
  isStreaming?: boolean;         // ⬅️ ADD
}

export function MessageList({ 
  messages, 
  conversationId,
  streamingMessage = '',
  isStreaming = false 
}: MessageListProps) {
  const isThinking = useAppStore((state) => state.isThinking);

  // Empty state
  if (messages.length === 0 && !isThinking) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center h-full text-center py-16"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center mb-4"
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/70 text-lg font-medium"
        >
          Start a conversation
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/50 text-sm mt-1"
        >
          Type a message below to begin
        </motion.p>
      </motion.div>
    );
  }

  // Container animation with stagger
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08, // Stagger each message by 80ms
        delayChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-0"
    >
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
            conversationId={conversationId}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}