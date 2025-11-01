import { useState, FormEvent, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Loader2, Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { debounce } from '@/lib/utils'
import type { RegisterData } from '@/types'

export function RegisterPage() {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  })

  const [validation, setValidation] = useState({
    username: { checking: false, available: null as boolean | null },
    email: { checking: false, available: null as boolean | null },
  })

  const { register, checkUsername, checkEmail, isLoading } = useAuth()
  const { error, clearError } = useAuthStore()

  // Debounced username check
  useEffect(() => {
    if (formData.username.length < 3) {
      setValidation((prev) => ({
        ...prev,
        username: { checking: false, available: null },
      }))
      return
    }

    setValidation((prev) => ({
      ...prev,
      username: { checking: true, available: null },
    }))

    const check = debounce(async () => {
      try {
        const result = await checkUsername(formData.username)
        setValidation((prev) => ({
          ...prev,
          username: { checking: false, available: result.available },
        }))
      } catch {
        setValidation((prev) => ({
          ...prev,
          username: { checking: false, available: null },
        }))
      }
    }, 500)

    check()
  }, [formData.username, checkUsername])

  // Debounced email check
  useEffect(() => {
    if (!formData.email.includes('@')) {
      setValidation((prev) => ({
        ...prev,
        email: { checking: false, available: null },
      }))
      return
    }

    setValidation((prev) => ({
      ...prev,
      email: { checking: true, available: null },
    }))

    const check = debounce(async () => {
      try {
        const result = await checkEmail(formData.email)
        setValidation((prev) => ({
          ...prev,
          email: { checking: false, available: result.available },
        }))
      } catch {
        setValidation((prev) => ({
          ...prev,
          email: { checking: false, available: null },
        }))
      }
    }, 500)

    check()
  }, [formData.email, checkEmail])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    clearError()

    // Validate passwords match
    if (formData.password !== formData.password_confirm) {
      return
    }

    register(formData)
  }

  const handleChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) clearError()
  }

  const passwordsMatch = formData.password === formData.password_confirm
  const canSubmit =
    formData.username &&
    formData.email &&
    formData.password &&
    passwordsMatch &&
    validation.username.available === true &&
    validation.email.available === true &&
    !isLoading

  return (
    <div className="card p-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create your account
        </h1>
        <p className="text-gray-600">
          Join Smolagent and start building
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Username *
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={handleChange('username')}
              className="input pr-10"
              placeholder="Choose a username"
              required
              minLength={3}
              disabled={isLoading}
            />
            {validation.username.checking && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
            )}
            {validation.username.available === true && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
            {validation.username.available === false && (
              <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            )}
          </div>
          {validation.username.available === false && (
            <p className="text-xs text-red-600 mt-1">Username already taken</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Email *
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              className="input pr-10"
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
            {validation.email.checking && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
            )}
            {validation.email.available === true && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
            {validation.email.available === false && (
              <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            )}
          </div>
          {validation.email.available === false && (
            <p className="text-xs text-red-600 mt-1">Email already registered</p>
          )}
        </div>

        {/* First & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="first_name"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              First name
            </label>
            <input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange('first_name')}
              className="input"
              placeholder="John"
              disabled={isLoading}
            />
          </div>
          <div>
            <label
              htmlFor="last_name"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Last name
            </label>
            <input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange('last_name')}
              className="input"
              placeholder="Doe"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Password *
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            className="input"
            placeholder="Create a strong password"
            required
            minLength={8}
            disabled={isLoading}
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="password_confirm"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Confirm password *
          </label>
          <input
            id="password_confirm"
            type="password"
            value={formData.password_confirm}
            onChange={handleChange('password_confirm')}
            className="input"
            placeholder="Confirm your password"
            required
            disabled={isLoading}
          />
          {formData.password_confirm && !passwordsMatch && (
            <p className="text-xs text-red-600 mt-1">Passwords don't match</p>
          )}
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
          disabled={!canSubmit}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Create account
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          Sign in here
        </Link>
      </div>
    </div>
  )
}