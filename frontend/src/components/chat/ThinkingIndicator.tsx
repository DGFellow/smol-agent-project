// src/components/chat/ThinkingIndicator.tsx
import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface ThinkingStep {
  content: string;
  step: number;
  timestamp: number;
}

interface ThinkingIndicatorProps {
  steps?: ThinkingStep[];
  isComplete?: boolean;
  duration?: number;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  steps = [],
  isComplete = false,
  duration
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isComplete) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 0.1);
      }, 100);
      return () => clearInterval(interval);
    } else if (duration) {
      setElapsedTime(duration);
    }
  }, [isComplete, duration]);

  return (
    <div className="thinking-container bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!isComplete ? (
            <>
              <div className="thinking-spinner">
                <div className="spinner-dot"></div>
                <div className="spinner-dot"></div>
                <div className="spinner-dot"></div>
              </div>
              <span className="text-gray-300 font-medium">Thinking</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 font-medium">
                Thought for {elapsedTime.toFixed(1)}s
              </span>
            </>
          )}
        </div>
        {isComplete && (
          <span className="text-green-400 text-sm">Done</span>
        )}
      </div>

      {/* Thinking Steps */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="thinking-step flex items-start gap-2 text-sm text-gray-400 animate-fadeIn"
            >
              <span className="text-blue-400 font-mono">•</span>
              <span>{step.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Add this CSS to your global styles
const styles = `
.thinking-spinner {
  display: flex;
  gap: 4px;
}

.spinner-dot {
  width: 6px;
  height: 6px;
  background-color: #60a5fa;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.spinner-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.spinner-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;