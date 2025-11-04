// src/components/chat/ChatView.tsx
/**
 * ChatView - Composer removed (now in Footer)
 * Only handles message display and streaming
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageList } from './MessageList';
import { ThinkingIndicator } from './ThinkingIndicator';
import { useChat } from '@/hooks/useChat';
import { useAppStore } from '@/store/appStore';
import type { Conversation } from '@/types';

interface ChatViewProps {
  conversation: Conversation | null;
  isLoading: boolean;
}

export function ChatView({ conversation, isLoading }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isStreaming, streamingMessage, thinkingSteps, thinkingComplete, thinkingDuration } = useChat(conversation?.id);
  const isThinking = useAppStore((state) => state.isThinking);
  
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Word-by-word streaming
  useEffect(() => {
    if (!streamingMessage) {
      setDisplayedWords([]);
      setCurrentWordIndex(0);
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      return;
    }

    const words = streamingMessage.split(/(\s+)/);
    
    if (words.length === 0) return;

    if (currentWordIndex === 0 && displayedWords.length > 0) {
      setDisplayedWords([]);
    }

    if (currentWordIndex < words.length) {
      streamingTimeoutRef.current = setTimeout(() => {
        setDisplayedWords(prev => [...prev, words[currentWordIndex]]);
        setCurrentWordIndex(prev => prev + 1);
      }, 80);
    }

    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [streamingMessage, currentWordIndex, displayedWords.length]);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedWords([]);
      setCurrentWordIndex(0);
    }
  }, [isStreaming]);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [conversation?.messages?.length, displayedWords, isThinking]);

  useEffect(() => {
    if (conversation?.id && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }, 100);
    }
  }, [conversation?.id]);

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
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/70">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-lg">No conversation selected</p>
          <p className="text-sm text-white/50 mt-2">Select a conversation or start a new one</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Messages Area - Scrollable, takes all available space */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {conversation.messages && conversation.messages.length > 0 ? (
            <MessageList 
              messages={conversation.messages} 
              conversationId={conversation.id}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
            />
          ) : (
            <div className="text-center text-white/50 py-12">
              <p className="text-lg">Start the conversation...</p>
            </div>
          )}
          
          {/* Streaming preview */}
          <AnimatePresence>
            {(isStreaming || isThinking) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="message-row w-full py-6 bg-white/5"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <motion.div 
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Bot className="w-5 h-5 text-white" />
                    </motion.div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white mb-2 text-sm">
                      Assistant
                    </div>
                    
                    {isThinking && (
                      <div className="mb-3">
                        <ThinkingIndicator
                          steps={thinkingSteps}
                          isComplete={thinkingComplete}
                          duration={thinkingDuration}
                        />
                      </div>
                    )}
                    
                    {displayedWords.length > 0 && (
                      <div className="text-white/90 text-[15px] leading-relaxed">
                        {displayedWords.join('')}
                        <motion.span
                          className="inline-block w-2 h-4 bg-green-400 ml-1 rounded-sm"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}