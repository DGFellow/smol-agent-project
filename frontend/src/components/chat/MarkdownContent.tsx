// src/components/chat/MarkdownContent.tsx
/**
 * MarkdownContent - Renders markdown with code highlighting
 */

import { CodeBlock } from './CodeBlock'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  // Parse markdown and render with CodeBlock
  const parts = parseMarkdownWithCode(content)

  return (
    <div className="markdown-content prose prose-sm max-w-none text-white/90">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language || 'text'}
            />
          )
        }
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(part.content) }}
          />
        )
      })}
    </div>
  )
}

// Parse markdown into code blocks and regular content
interface ParsedPart {
  type: 'text' | 'code'
  content: string
  language?: string
}

function parseMarkdownWithCode(text: string): ParsedPart[] {
  const parts: ParsedPart[] = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    // Add code block
    parts.push({
      type: 'code',
      content: match[2].trim(),
      language: match[1] || 'text',
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

// Parse inline markdown (bold, italic, links, inline code)
function parseInlineMarkdown(text: string): string {
  let html = text

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code bg-white/20 text-white px-1.5 py-0.5 rounded font-mono text-sm">$1</code>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>'
  )

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mt-3">')
  html = html.replace(/\n/g, '<br>')

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<h') && !html.startsWith('<p')) {
    html = `<p>${html}</p>`
  }

  return html
}