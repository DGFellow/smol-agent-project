// src/components/chat/MarkdownContent.tsx - WITH SYNTAX HIGHLIGHTING

import { CodeBlock } from './CodeBlock';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return <div className="markdown-content prose prose-sm max-w-none">{parseMarkdown(content)}</div>;
}

function parseMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Match code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index);
      elements.push(
        <span key={`text-${key++}`} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(textBefore) }} />
      );
    }

    // Add code block
    const language = match[1] || 'text';
    const code = match[2].trim();
    elements.push(<CodeBlock key={`code-${key++}`} code={code} language={language} />);

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex);
    elements.push(
      <span key={`text-${key++}`} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(textAfter) }} />
    );
  }

  return elements;
}

function parseInlineMarkdown(text: string): string {
  let html = text;

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code bg-gray-800 text-green-400 px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>'
  );

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}