interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div
      className="markdown-content prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  )
}

// Simple markdown parser
function parseMarkdown(text: string): string {
  let html = text

  // Code blocks with language
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => { // Changed to _
    const language = lang || 'code'
    const escapedCode = escapeHtml(code.trim())
    return `
      <div class="code-block my-4 rounded-lg overflow-hidden border border-gray-700">
        <div class="code-header flex justify-between items-center px-4 py-2 bg-gray-900 border-b border-gray-700">
          <span class="code-lang text-xs font-semibold text-gray-400 uppercase">${language}</span>
          <button 
            class="copy-btn text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
            onclick="copyCode(this)"
            title="Copy code"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        <pre class="bg-gray-900 text-gray-100 p-4 overflow-x-auto"><code class="language-${language}">${escapedCode}</code></pre>
      </div>
    `
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">$1</a>')

  // Line breaks
  html = html.replace(/\n/g, '<br>')

  return html
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Global function for copy button (called from dangerouslySetInnerHTML)
declare global {
  interface Window {
    copyCode: (button: HTMLButtonElement) => void
  }
}

if (typeof window !== 'undefined') {
  window.copyCode = async (button: HTMLButtonElement) => {
    const codeBlock = button.closest('.code-block')
    if (!codeBlock) return

    const code = codeBlock.querySelector('code')?.textContent || ''
    
    try {
      await navigator.clipboard.writeText(code)
      
      // Visual feedback
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      `
      
      setTimeout(() => {
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        `
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }
}