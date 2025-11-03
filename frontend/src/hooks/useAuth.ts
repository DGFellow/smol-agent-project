import { useState, useCallback } from 'react'
import { authApi } from '@/lib/api'
import type { RegisterData, AuthResponse, FieldValidation } from '@/types'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)

  // Zustand selectors
  const setError = useAuthStore((s) => s.setError)
  const clearError = useAuthStore((s) => s.clearError)
  const loginAction = useAuthStore((s) => s.login)  // ← Use atomic login
  const logoutAction = useAuthStore((s) => s.logout)

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    setIsLoading(true)
    clearError()
    try {
      const res = await authApi.register(data)
      // Use atomic login action for registration too
      loginAction(res.token, res.user)
      return res
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Registration failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [clearError, setError, loginAction])

  const login = useCallback(async (creds: { username: string; password: string; two_factor_code?: string }): Promise<AuthResponse> => {
    setIsLoading(true)
    clearError()
    try {
      const res = await authApi.login(creds)
      if (res.requires_2fa) {
        // Return response for 2FA handling in component
        return res as AuthResponse & { requires_2fa: true; method: string }
      }
      // ✅ FIX: Use atomic login action that sets both token and user together
      loginAction(res.token, res.user)
      return res
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Login failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [clearError, setError, loginAction])

  const logout = useCallback(() => {
    logoutAction()
  }, [logoutAction])

  const checkUsername = useCallback(async (username: string): Promise<FieldValidation> => {
    return authApi.checkUsername(username)
  }, [])

  const checkEmail = useCallback(async (email: string): Promise<FieldValidation> => {
    return authApi.checkEmail(email)
  }, [])

  return { register, login, logout, checkUsername, checkEmail, isLoading }
}