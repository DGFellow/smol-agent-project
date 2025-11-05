// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: number
  username: string
  email: string
  first_name?: string | null
  last_name?: string | null
  email_verified: boolean
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  username: string
  password: string
  two_factor_code?: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
  birthdate?: string
  phone_number?: string
}

export interface AuthResponse {
  message: string
  token: string
  user: User
  requires_2fa?: boolean
  method?: string
}

// ============================================
// Conversation & Message Types
// ============================================

export interface ThinkingStep {
  content: string
  step: number
  timestamp: number
}

export interface ThinkingData {
  steps: ThinkingStep[]
  duration: number
}

export interface Message {
  id: number
  conversation_id?: number
  role: 'user' | 'assistant'
  content: string
  agent?: string | null
  model?: string | null
  reaction?: 'like' | 'dislike' | null
  created_at: string
  thinking?: ThinkingData
}

export interface Conversation {
  id: number
  user_id: number
  title: string
  preview?: string
  message_count?: number
  created_at: string
  updated_at: string
  messages?: Message[]
}

export interface ConversationListResponse {
  conversations: Conversation[]
  total: number
  limit: number
  offset: number
}

export interface ConversationResponse {
  conversation: Conversation
}

// ============================================
// API Request/Response Types
// ============================================

export interface MessageRequest {
  message: string
  conversation_id?: number | null
  stream?: boolean
  files?: string[]
}

export interface MessageResponse {
  response: string
  conversation_id: number
  is_new_conversation: boolean
  conversation_title?: string
  agent_used: string
  model: string
  langchain_enabled: boolean
  needs_language?: boolean
}

export interface ApiError {
  error: string
  message?: string
  details?: Record<string, any>
}

// ============================================
// UI State Types
// ============================================

export type ViewMode = 'hero' | 'chat'

export interface AppState {
  currentConversationId: number | null
  viewMode: ViewMode
  sidebarExpanded: boolean
  isLoading: boolean
}

export interface ThinkingState {
  isThinking: boolean
  messageId?: string
}

// ============================================
// Health & Stats Types
// ============================================

export interface HealthResponse {
  status: string
  langchain_enabled: boolean
  models: string[]
  agents: string[]
  stats: {
    total_requests: number
    avg_response_time_ms: number
  }
}

// ============================================
// Form Validation Types
// ============================================

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export interface FieldValidation {
  available?: boolean
  message: string
}

// ============================================
// Markdown & Rendering Types
// ============================================

export interface CodeBlock {
  language: string
  code: string
}

// ============================================
// Export/Import Types
// ============================================

export type ExportFormat = 'markdown' | 'json' | 'pdf'

export interface ExportOptions {
  format: ExportFormat
  conversationId: number
  includeMetadata?: boolean
}

// ============================================
// File Upload Types
// ============================================

export interface UploadedFile {
  file_id: string
  filename: string
  original_name: string
  size: number
  mime_type: string
  conversation_id?: number
  uploaded_at: string
  path: string
}

export interface FileUploadResponse {
  success: boolean
  file: UploadedFile
  message?: string
}

export interface FileDeleteResponse {
  success: boolean
  file_id: string
  message: string
}

export interface AttachedFile {
  file: File
  preview?: string
  uploading: boolean
  uploaded: boolean
  uploadProgress?: number
  fileId?: string
  error?: string
}

export interface FilePreviewProps {
  file: AttachedFile
  onRemove: (file: File) => void
  showProgress?: boolean
}