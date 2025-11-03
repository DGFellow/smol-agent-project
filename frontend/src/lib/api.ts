import axios, { AxiosError, AxiosInstance } from 'axios'
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  MessageRequest,
  MessageResponse,
  ConversationListResponse,
  ConversationResponse,
  HealthResponse,
  FieldValidation,
} from '@/types'

// -------- baseURL resolution (dev-proxy first, prod override allowed) --------
const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

const envBaseRaw =
  (import.meta as any).env?.VITE_BACKEND_URL ??
  (import.meta as any).env?.VITE_API_URL

const normalizeBase = (s?: string) => {
  if (!s) return '/api'
  return s.endsWith('/') ? s.slice(0, -1) : s
}

const resolvedBaseURL = isDev ? '/api' : normalizeBase(envBaseRaw)

// -------- axios instance --------
const api: AxiosInstance = axios.create({
  baseURL: resolvedBaseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
})

// -------- interceptors --------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error.response?.status
    if (status === 401 || status === 419) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      const currentPath = window.location.pathname
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

// ============================================
// Authentication API
// ============================================
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', userData)
    return data
  },

  verifyToken: async (): Promise<{ valid: boolean; user: any }> => {
    const { data } = await api.get('/auth/verify')
    return data
  },

  checkUsername: async (username: string): Promise<FieldValidation> => {
    const { data } = await api.post<FieldValidation>('/auth/check-username', { username })
    return data
  },

  checkEmail: async (email: string): Promise<FieldValidation> => {
    const { data } = await api.post<FieldValidation>('/auth/check-email', { email })
    return data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  },
}

// ============================================
// Conversation API
// ============================================
export const conversationApi = {
  list: async (params?: {
    limit?: number
    offset?: number
  }): Promise<ConversationListResponse> => {
    const { data } = await api.get<ConversationListResponse>('/conversations', { params })
    return data
  },

  get: async (id: number): Promise<ConversationResponse> => {
    const { data } = await api.get<ConversationResponse>(`/conversations/${id}`)
    return data
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/conversations/${id}`)
    return data
  },

  updateTitle: async (
    id: number,
    title: string
  ): Promise<{ message: string; title: string }> => {
    const { data } = await api.put(`/conversations/${id}/title`, { title })
    return data
  },
}

// ============================================
// Message API
// ============================================
export const messageApi = {
  send: async (request: MessageRequest): Promise<MessageResponse> => {
    const { data } = await api.post<MessageResponse>('/message', request)
    return data
  },

  // Streaming message support
  sendStream: async (
    request: MessageRequest,
    onChunk: (chunk: string) => void
  ): Promise<MessageResponse> => {
    const response = await fetch(`${resolvedBaseURL}/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''
    let metadata: any = null

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              break
            }

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'token') {
                fullResponse += parsed.content
                onChunk(parsed.content)
              } else if (parsed.type === 'metadata') {
                metadata = parsed
              } else if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    // Return in expected format
    return {
      response: fullResponse,
      conversation_id: metadata?.conversation_id || 0,
      is_new_conversation: metadata?.is_new_conversation || false,
      conversation_title: metadata?.conversation_title,
      agent_used: metadata?.agent_used || 'unknown',
      model: metadata?.model || 'unknown',
      langchain_enabled: metadata?.langchain_enabled || false,
    }
  },

  clear: async (conversationId: number): Promise<{ status: string }> => {
    const { data } = await api.post('/clear', { conversation_id: conversationId })
    return data
  },

  // Message reactions
  react: async (
    messageId: number,
    reaction: 'like' | 'dislike' | null
  ): Promise<{ success: boolean }> => {
    const { data } = await api.post(`/message/${messageId}/reaction`, { reaction })
    return data
  },

  // Regenerate message
  regenerate: async (conversationId: number, messageId: number): Promise<MessageResponse> => {
    const { data } = await api.post<MessageResponse>('/message/regenerate', {
      conversation_id: conversationId,
      message_id: messageId,
    })
    return data
  },
}

// ============================================
// File API
// ============================================
export const fileApi = {
  upload: async (
    file: File,
    conversationId?: number
  ): Promise<{ file_id: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    if (conversationId) {
      formData.append('conversation_id', conversationId.toString())
    }

    const { data } = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },
}

// ============================================
// Health API
// ============================================
export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const { data } = await api.get<HealthResponse>('/health')
    return data
  },
}

// ============================================
// Error Helper
// ============================================
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverMsg =
      (error.response?.data as any)?.error ||
      (error.response?.data as any)?.message
    return serverMsg || error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

export default api