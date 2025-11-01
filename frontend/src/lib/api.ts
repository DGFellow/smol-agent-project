import axios, { AxiosError, AxiosInstance } from 'axios'
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  MessageRequest,
  MessageResponse,
  Conversation,
  ConversationListResponse,
  ConversationResponse,
  HealthResponse,
  FieldValidation,
} from '@/types'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for session cookies
})

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
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
    const { data } = await api.post<FieldValidation>('/auth/check-username', {
      username,
    })
    return data
  },

  checkEmail: async (email: string): Promise<FieldValidation> => {
    const { data } = await api.post<FieldValidation>('/auth/check-email', {
      email,
    })
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
    const { data } = await api.get<ConversationListResponse>('/conversations', {
      params,
    })
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

  clear: async (conversationId: number): Promise<{ status: string }> => {
    const { data } = await api.post('/clear', { conversation_id: conversationId })
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
    return error.response?.data?.error || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// Export axios instance for custom requests
export default api