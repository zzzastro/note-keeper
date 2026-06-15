import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-8 h-8 text-yellow-500" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <h1 className="text-xl font-medium text-gray-800">Note Keeper</h1>
        </div>

        <h2 className="text-lg font-medium mb-4">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded-lg">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-yellow-400 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-yellow-400 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError('') }}
                className="text-yellow-600 hover:underline cursor-pointer font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="text-yellow-600 hover:underline cursor-pointer font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
