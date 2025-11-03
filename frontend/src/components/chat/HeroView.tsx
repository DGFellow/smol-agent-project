import { MessageComposer } from './MessageComposer'
import { Sparkles } from 'lucide-react'
import type { User } from '@/types'

interface HeroViewProps {
  user: User | null
}

const SUGGESTION_CHIPS = [
  { id: 'code', label: '⌥ Code', prompt: 'Help me write a Python script' },
  { id: 'write', label: '✎ Write', prompt: 'Help me write an email' },
  { id: 'strategy', label: '↗ Strategize', prompt: 'Help me plan a project' },
  { id: 'learn', label: '🎓 Learn', prompt: 'Explain quantum computing simply' },
  { id: 'life', label: '☕ Life stuff', prompt: 'Give me advice on work-life balance' },
]

export function HeroView({ user }: HeroViewProps) {
  const firstName = user?.first_name || user?.username?.split(' ')[0] || 'there'

  const handleChipClick = (prompt: string) => {
    // TODO: Pre-fill the message composer with the prompt
    console.log('Selected prompt:', prompt)
  }

  return (
    <div className="empty-hero flex flex-col items-center justify-center flex-1 gap-6 text-center py-12">
      {/* Hero Title */}
      <h2 className="hero-title text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
        <Sparkles className="inline-block w-10 h-10 text-secondary-500 mr-2 -mt-1" />
        Hi {firstName}, how can I help?
      </h2>

      {/* Message Composer */}
      <MessageComposer
        placeholder="How can I help you today?"
        autoFocus
      />

      {/* Suggestion Chips */}
      <div className="hero-chips flex flex-wrap gap-3 justify-center max-w-2xl">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => handleChipClick(chip.prompt)}
            className="chip border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-full font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}