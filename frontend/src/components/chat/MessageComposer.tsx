// frontend/src/components/chat/MessageComposer.tsx - ENHANCED VERSION
import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from 'react'
import { Send, Paperclip, Upload } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { fileApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FilePreview } from './FilePreview'
import type { AttachedFile } from '@/types'

interface MessageComposerProps {
  placeholder?: string
  conversationId?: number | null
  autoFocus?: boolean
  onSent?: () => void
}

export function MessageComposer({
  placeholder = 'Message Assistant...',
  conversationId = null,
  autoFocus = false,
  onSent,
}: MessageComposerProps) {
  const [message, setMessage] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  
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

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processFiles = async (files: File[]) => {
    // Create attachments with initial state
    const newAttachments: AttachedFile[] = files.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: true,
      uploaded: false,
      uploadProgress: 0,
    }))

    setAttachedFiles(prev => [...prev, ...newAttachments])

    // Upload each file
    for (const attachment of newAttachments) {
      try {
        const result = await fileApi.upload(
          attachment.file,
          conversationId ?? undefined,
          (progress) => {
            // Update progress
            setAttachedFiles(prev => prev.map(f =>
              f.file === attachment.file
                ? { ...f, uploadProgress: progress }
                : f
            ))
          }
        )

        // Mark as uploaded
        setAttachedFiles(prev => prev.map(f =>
          f.file === attachment.file
            ? { ...f, uploading: false, uploaded: true, fileId: result.file_id }
            : f
        ))

        showToast(`${attachment.file.name} uploaded successfully`, 'success')
      } catch (error) {
        console.error('Upload failed:', error)
        setAttachedFiles(prev => prev.map(f =>
          f.file === attachment.file
            ? { ...f, uploading: false, error: 'Upload failed' }
            : f
        ))
        showToast(`Failed to upload ${attachment.file.name}`, 'error')
      }
    }
  }

  const removeAttachment = (file: File) => {
    setAttachedFiles(prev => {
      const attachment = prev.find(f => f.file === file)
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
      return prev.filter(f => f.file !== file)
    })
  }

  const handleSubmit = () => {
    if ((!message.trim() && attachedFiles.length === 0) || isSending) {
      return
    }

    // Check if any files are still uploading
    const stillUploading = attachedFiles.some(f => f.uploading)
    if (stillUploading) {
      showToast('Please wait for all files to finish uploading', 'info')
      return
    }

    // Get uploaded file IDs
    const uploadedFiles = attachedFiles
      .filter(f => f.uploaded && f.fileId)
      .map(f => f.fileId!)

    sendMessage({
      message: message.trim(),
      conversation_id: conversationId,
      files: uploadedFiles
    })

    setMessage('')
    setAttachedFiles([])
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    onSent?.()
  }

  const hasUploadedFiles = attachedFiles.some(f => f.uploaded)
  const canSend = (message.trim() || hasUploadedFiles) && !isSending

  return (
    <div className="message-composer w-full max-w-3xl mx-auto">
      {/* Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="attachments-grid mb-3 px-4 space-y-2">
          {attachedFiles.map((att, index) => (
            <FilePreview
              key={`${att.file.name}-${index}`}
              file={att}
              onRemove={removeAttachment}
            />
          ))}
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm rounded-3xl border-2 border-dashed border-blue-400 pointer-events-none">
          <div className="text-center">
            <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <p className="text-lg font-medium text-white">Drop files here</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className={cn(
          'composer-wrapper bg-white rounded-3xl shadow-lg transition-all relative',
          isDragging && 'ring-2 ring-blue-400 ring-offset-2',
          'focus-within:shadow-2xl'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="composer-inner flex items-end gap-2 p-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="composer-btn flex-shrink-0 p-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Attach files (or drag & drop)"
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
              canSend
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
            title="Send message"
            disabled={!canSend}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="text-center text-xs text-white/70 mt-2">
        {isSending ? (
          <span>Sending...</span>
        ) : (
          <span>Press Enter to send • Shift+Enter for new line • Drag files to attach</span>
        )}
      </div>
    </div>
  )
}