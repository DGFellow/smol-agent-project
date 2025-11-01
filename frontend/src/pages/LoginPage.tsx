import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import type { LoginCredentials } from '@/types'

export function LoginPage() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  })
  const { login, isLoading } = useAuth()
  const { error, clearError } = useAuthStore()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    clearError()
    login(credentials)
  }

  const handleChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) clearError()
  }

  return (
    <div className="card p-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back
        </h1>
        <p className="text-gray-600">
          Sign in to continue your AI conversations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={credentials.username}
            onChange={handleChange('username')}
            className="input"
            placeholder="Enter your username"
            required
            autoComplete="username"
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={credentials.password}
            onChange={handleChange('password')}
            className="input"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Sign in
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          Sign up here
        </Link>
      </div>
    </div>
  )
}