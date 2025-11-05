// frontend/src/components/chat/FilePreview.tsx
import { X, FileText, FileImage, FileCode, File as FileIcon, Loader2 } from 'lucide-react'
import { AttachedFile } from '@/types'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  file: AttachedFile
  onRemove: (file: File) => void
  showProgress?: boolean
}

/**
 * FilePreview - Display attached file with preview, progress, and remove button
 * Supports images (thumbnail), code files (icon), and generic files
 */
export function FilePreview({ file, onRemove, showProgress = true }: FilePreviewProps) {
  const { file: fileObj, preview, uploading, uploaded, uploadProgress = 0, error } = file

  // Determine file type for icon
  const getFileIcon = () => {
    const ext = fileObj.name.split('.').pop()?.toLowerCase()
    
    if (fileObj.type.startsWith('image/')) {
      return <FileImage className="w-5 h-5" />
    }
    
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'rs', 'go'].includes(ext || '')) {
      return <FileCode className="w-5 h-5" />
    }
    
    if (['txt', 'md', 'doc', 'docx', 'pdf'].includes(ext || '')) {
      return <FileText className="w-5 h-5" />
    }
    
    return <FileIcon className="w-5 h-5" />
  }

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className={cn(
        'relative group flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-3 transition-all',
        uploading && 'animate-pulse',
        error && 'bg-red-500/10 border border-red-500/30',
        uploaded && 'bg-green-500/10 border border-green-500/30'
      )}
    >
      {/* Image Preview or Icon */}
      <div className="flex-shrink-0">
        {preview ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/20">
            <img
              src={preview}
              alt={fileObj.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-white/70">
            {getFileIcon()}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">
            {fileObj.name}
          </p>
          {uploading && (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-white/60">
            {formatSize(fileObj.size)}
          </p>
          
          {error && (
            <p className="text-xs text-red-400">Upload failed</p>
          )}
          
          {uploaded && !error && (
            <p className="text-xs text-green-400">✓ Uploaded</p>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && uploading && !error && (
          <div className="mt-2 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(fileObj)}
        className={cn(
          'flex-shrink-0 p-2 rounded-lg transition-all',
          'text-white/50 hover:text-red-400 hover:bg-red-500/10',
          uploading && 'pointer-events-none opacity-50'
        )}
        disabled={uploading}
        title="Remove file"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}