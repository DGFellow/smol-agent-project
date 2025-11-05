// src/components/chat/MessageBubble.tsx - WITH DEBUG LOGS
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MessageRenderer } from './MessageRenderer';
import { MessageActions } from './MessageActions';
import { useChat } from '@/hooks/useChat';

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
  conversationId?: number;
  isStreaming?: boolean;
  streamingContent?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message,
  conversationId,
  isStreaming = false,
  streamingContent = ''
}) => {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const { reactToMessage, regenerateMessage } = useChat(conversationId);

  const displayContent = isStreaming && streamingContent ? streamingContent : message.content;

  // 🔥 DEBUG LOGS
  console.log('💬 MessageBubble RENDER:', {
    role: message.role,
    messageId: message.id,
    isStreaming,
    streamingContent: streamingContent.substring(0, 50),
    displayContent: displayContent.substring(0, 50),
    hasThinking: !!message.thinking,
    thinkingSteps: message.thinking?.steps.length || 0
  });

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
    const textToCopy = isStreaming && streamingContent ? streamingContent : message.content;
    await navigator.clipboard.writeText(textToCopy);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    console.log('Save edit:', editedContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    regenerateMessage?.(message.id);
  };

  const handleReact = (reaction: 'like' | 'dislike' | null) => {
    reactToMessage(message.id, reaction);
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
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full bg-white/10 text-white rounded-lg px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-white/50"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-sm text-white/70 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded-md transition-colors"
                      >
                        Save & Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
              </div>
              
              {/* Actions */}
              {!isEditing && (
                <MessageActions
                  messageId={message.id}
                  role={message.role}
                  content={message.content}
                  reaction={message.reaction}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                />
              )}
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

              {/* Message Content - Use MessageRenderer for streaming */}
              <MessageRenderer
                content={displayContent}
                isStreaming={isStreaming}
              />

              {/* Actions */}
              {!isStreaming && message.id !== -1 && (
                <MessageActions
                  messageId={message.id}
                  role={message.role}
                  content={message.content}
                  reaction={message.reaction}
                  onCopy={handleCopy}
                  onRegenerate={handleRegenerate}
                  onReact={handleReact}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};