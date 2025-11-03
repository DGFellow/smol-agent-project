// frontend/src/components/chat/MessageComposer.tsx
import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { fileApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface MessageComposerProps {
  placeholder?: string
  conversationId?: number | null
  autoFocus?: boolean
  onSent?: () => void
}

interface AttachedFile {
  file: File
  preview?: string
  uploading: boolean
  uploaded: boolean
  fileId?: string
}

export function MessageComposer({
  placeholder = 'Message Assistant...',
  conversationId = null,
  autoFocus = false,
  onSent,
}: MessageComposerProps) {
  const [message, setMessage] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sendMessage, isSending, showToast } = useChat(conversationId)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const autoResize = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    const maxHeight = 200
    const newHeight = Math.min(element.scrollHeight, maxHeight)
    element.style.height = `${newHeight}px`
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    autoResize(e.target)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newAttachments: AttachedFile[] = files.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: true,
      uploaded: false,
    }))

    setAttachedFiles(prev => [...prev, ...newAttachments])

    for (const attachment of newAttachments) {
      try {
        const { file_id } = await fileApi.upload(attachment.file, conversationId ?? undefined)
        setAttachedFiles(prev => prev.map(f =>
          f.file === attachment.file
            ? { ...f, uploading: false, uploaded: true, fileId: file_id }
            : f
        ))
      } catch (error) {
        showToast('Failed to upload file', 'error')
        setAttachedFiles(prev => prev.filter(f => f.file !== attachment.file))
      }
    }
  }

  const removeAttachment = (file: File) => {
    setAttachedFiles(prev => prev.filter(f => f.file !== file))
  }

  const handleSubmit = () => {
    console.log('handleSubmit called with message:', message, 'conversationId:', conversationId, 'isSending:', isSending);
    if ((!message.trim() && attachedFiles.length === 0) || isSending) {
      console.log('Submit blocked: empty message or sending');
      return;
    }

    const uploadedFiles = attachedFiles
      .filter(f => f.uploaded)
      .map(f => f.fileId!);

    console.log('Calling sendMessage with:', { message: message.trim(), conversation_id: conversationId, files: uploadedFiles });
    sendMessage({
      message: message.trim(),
      conversation_id: conversationId,
      files: uploadedFiles
    });

    setMessage('');
    setAttachedFiles([]);
    onSent?.();
  };

  return (
    <div className="message-composer w-full max-w-3xl mx-auto">
      {/* Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="attachments flex flex-wrap gap-2 mb-2 px-4">
          {attachedFiles.map((att, index) => (
            <div
              key={index}
              className="attachment-item flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm text-white/80"
            >
              {att.preview ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span className="truncate max-w-[120px]">{att.file.name}</span>
              {att.uploading ? (
                <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
              ) : (
                <button
                  onClick={() => removeAttachment(att.file)}
                  className="text-white/50 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="composer-wrapper bg-white rounded-3xl shadow-lg focus-within:shadow-2xl">
        <div className="composer-inner flex items-end gap-2 p-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx,.md"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="composer-btn flex-shrink-0 p-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Attach file"
            disabled={isSending}
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="composer-input flex-1 resize-none bg-transparent border-0 outline-none text-gray-900 placeholder-gray-500 min-h-[24px] max-h-[200px] py-2 px-2"
            rows={1}
            disabled={isSending}
          />

          <button
            onClick={handleSubmit}
            className={cn(
              'composer-send flex-shrink-0 p-2.5 rounded-xl transition-all',
              (message.trim() || attachedFiles.length > 0) && !isSending
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
            title="Send message"
            disabled={(!message.trim() && attachedFiles.length === 0) || isSending}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="text-center text-xs text-white/70 mt-2">
        {isSending ? (
          <span>Sending...</span>
        ) : (
          <span>Press Enter to send, Shift+Enter for new line</span>
        )}
      </div>
    </div>
  )
}