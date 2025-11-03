// src/components/chat/MessageList.tsx
import { motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import { useAppStore } from '@/store/appStore';
import { useChat } from '@/hooks/useChat';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  conversationId?: number;
}

export function MessageList({ messages, conversationId }: MessageListProps) {
  const isThinking = useAppStore((state) => state.isThinking);
  const { thinkingSteps, thinkingComplete, thinkingDuration } = useChat(conversationId);

  if (messages.length === 0 && !isThinking) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-full text-white/50"
      >
        <p>No messages yet. Start a conversation!</p>
      </motion.div>
    );
  }

  // Container animation variants for stagger effect
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
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
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
        />
      ))}
      
      {/* Show thinking indicator when waiting for response */}
      {isThinking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="message-row w-full py-6 bg-white/5"
        >
          <div className="max-w-4xl mx-auto px-4 flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white mb-2 text-sm">
                Assistant
              </div>
              <ThinkingIndicator 
                steps={thinkingSteps} 
                isComplete={thinkingComplete} 
                duration={thinkingDuration} 
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}