// src/components/chat/HeroView.tsx
/**
 * HeroView - Landing page shown when no conversation is active
 * Includes integrated composer
 */

import { motion } from 'framer-motion'
import { MessageComposer } from './MessageComposer'

const suggestions = [
  { emoji: '💻', label: 'Code', text: 'Help me write a Python function' },
  { emoji: '✍️', label: 'Write', text: 'Draft an email for me' },
  { emoji: '⚡', label: 'Strategize', text: 'Plan my product roadmap' },
  { emoji: '🎓', label: 'Learn', text: 'Explain quantum computing' },
  { emoji: '💝', label: 'Life stuff', text: 'Give me gift ideas' },
]

export function HeroView() {
  return (
    <div className="h-full flex flex-col">
      {/* Main content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl"
        >
          {/* Animated icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-green-500 mb-6"
          >
            <span className="text-3xl">✨</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight"
          >
            Hi Dominic, how can I help?
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-white/70 mb-8"
          >
            Start a conversation or try one of these suggestions
          </motion.p>

          {/* Suggestion chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-3 justify-center mb-12"
          >
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="group px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 hover:border-white/50 rounded-full transition-all duration-200 hover:scale-105"
              >
                <span className="flex items-center gap-2 text-white text-sm font-medium">
                  <span className="text-lg">{suggestion.emoji}</span>
                  {suggestion.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Composer - Sticky at bottom with gradient */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex-shrink-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent px-6 pt-6 pb-6"
      >
        <div className="max-w-4xl mx-auto">
          <MessageComposer
            placeholder="How can I help you today?"
            conversationId={null}
          />
        </div>
      </motion.div>
    </div>
  )
}