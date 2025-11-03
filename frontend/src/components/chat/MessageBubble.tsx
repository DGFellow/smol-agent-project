// src/components/chat/MessageBubble.tsx
import React from 'react';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: {
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
  isStreaming 
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      {/* Show thinking indicator for assistant messages */}
      {!isUser && message.thinking && (
        <ThinkingIndicator
          steps={message.thinking.steps}
          isComplete={!isStreaming}
          duration={message.thinking.duration}
        />
      )}

      {/* Message content */}
      <div className={`message-content ${isUser ? 'user-message' : 'assistant-message'}`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
};