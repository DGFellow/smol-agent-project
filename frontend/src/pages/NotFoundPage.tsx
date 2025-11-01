import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold gradient-text mb-4">404</h1>
        <h2 className="text-3xl font-bold text-white mb-4">Page not found</h2>
        <p className="text-gray-200 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="btn-primary flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-ghost flex items-center gap-2 bg-white/10 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}