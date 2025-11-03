// src/components/chat/ThinkingIndicator.tsx
/**
 * ThinkingIndicator - Shows AI thinking process
 * 
 * Features:
 * - Expandable/collapsible steps
 * - Duration badge
 * - Smooth animations
 * - Stays visible in message history
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(true);

  // Timer for elapsed time
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

  // Collapse after completion (optional)
  useEffect(() => {
    if (isComplete && steps.length > 0) {
      // Auto-collapse after 3 seconds
      const timeout = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isComplete, steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="thinking-container bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {!isComplete ? (
            <>
              {/* Animated spinner */}
              <div className="thinking-spinner flex gap-1">
                <motion.div
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
              <span className="text-gray-300 font-medium text-sm">Thinking...</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 font-medium text-sm">
                Thought for {elapsedTime.toFixed(1)}s
              </span>
            </>
          )}
        </div>
        
        {/* Expand/Collapse button */}
        {steps.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
        
        {/* Status badge */}
        {isComplete && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full"
          >
            Done
          </motion.span>
        )}
      </div>

      {/* Thinking Steps - Collapsible */}
      <AnimatePresence>
        {isExpanded && steps.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-700/50">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-blue-400 font-mono text-xs mt-0.5">•</span>
                  <span className="text-gray-400 flex-1">{step.content}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed preview */}
      {!isExpanded && steps.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          {steps.length} step{steps.length !== 1 ? 's' : ''} • Click to expand
        </div>
      )}
    </motion.div>
  );
};