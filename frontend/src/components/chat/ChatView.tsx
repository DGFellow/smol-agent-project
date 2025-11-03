// src/components/chat/ChatView.tsx
import { useEffect, useRef, useState } from 'react';
import { Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { useChat } from '@/hooks/useChat';
import type { Conversation } from '@/types';

interface ChatViewProps {
  conversation: Conversation | null;
  isLoading: boolean;
}

export function ChatView({ conversation, isLoading }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isStreaming, streamingMessage } = useChat(conversation?.id);
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // Word-by-word streaming effect
  useEffect(() => {
    if (!streamingMessage) {
      setDisplayedWords([]);
      setCurrentWordIndex(0);
      return;
    }

    const words = streamingMessage.split(/(\s+)/); // Keep whitespace
    
    if (words.length === 0) return;

    // Reset if new message
    if (currentWordIndex === 0) {
      setDisplayedWords([]);
    }

    // Animate words one by one
    if (currentWordIndex < words.length) {
      const timer = setTimeout(() => {
        setDisplayedWords(prev => [...prev, words[currentWordIndex]]);
        setCurrentWordIndex(prev => prev + 1);
      }, 80); // 80ms per word = readable speed

      return () => clearTimeout(timer);
    }
  }, [streamingMessage, currentWordIndex]);

  // Reset when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedWords([]);
      setCurrentWordIndex(0);
    }
  }, [isStreaming]);

  // Smooth scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [conversation?.messages?.length, displayedWords]);

  // Initial scroll on load
  useEffect(() => {
    if (conversation && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }, 100);
    }
  }, [conversation?.id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/70">
        <p>No conversation selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
        {conversation.messages && conversation.messages.length > 0 ? (
          <>
            <MessageList 
              messages={conversation.messages} 
              conversationId={conversation.id} 
            />
            
            {/* Streaming message preview with word-by-word animation */}
            <AnimatePresence>
              {isStreaming && displayedWords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="message-row w-full py-6 bg-white/5"
                >
                  <div className="max-w-4xl mx-auto px-4 flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white mb-2 text-sm">
                        Assistant
                      </div>
                      <div className="text-white/90 text-[15px] leading-relaxed">
                        {displayedWords.join('')}
                        <motion.span
                          className="inline-block w-2 h-4 bg-white/50 ml-1"
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="text-center text-white/50 py-8">
            <p>Start the conversation...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Sticky at bottom */}
      <div className="flex-shrink-0 pb-6 px-4 bg-gradient-to-t from-gray-900/80 to-transparent pt-4">
        <MessageComposer
          placeholder="Message Assistant..."
          conversationId={conversation.id}
        />
      </div>
    </div>
  );
}