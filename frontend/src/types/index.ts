// frontend/src/types/index.ts

// ===== Auth =====
export type UserPublic = {
  id: number
  username: string
  email: string
  first_name?: string | null
  last_name?: string | null
  email_verified?: boolean
  two_factor_enabled?: boolean
}

export type LoginCredentials = {
  username: string
  password: string
}

export type RegisterData = {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

export type AuthResponse = {
  message?: string
  token: string
  user: UserPublic
}

export type FieldValidation = {
  available: boolean
  message?: string
}

// ===== Conversations / Messages =====
export type Message = {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string | number
  agent?: string
  model?: string
}

export type Conversation = {
  id: number
  user_id: number
  title: string
  created_at?: string | number
  updated_at?: string | number
  messages?: Message[]
}

export type ConversationListResponse = {
  conversations: Conversation[]
  total: number
  limit: number
  offset: number
}

export type ConversationResponse = {
  conversation: Conversation
}

// ===== Message API =====
export type MessageRequest = {
  message: string
  conversation_id?: number | string | null
}

export type MessageResponse = {
  response: string
  conversation_id: number
  is_new_conversation: boolean
  conversation_title?: string | null
  agent_used: string
  model: string
  langchain_enabled: boolean
  needs_language: boolean
}

// ===== Health =====
export type HealthResponse = {
  status: 'healthy' | 'degraded' | 'down' | string
  langchain_enabled: boolean
  models: string[]
  agents: string[]
  stats: {
    total_requests: number
    avg_response_time_ms: number
  }
}
