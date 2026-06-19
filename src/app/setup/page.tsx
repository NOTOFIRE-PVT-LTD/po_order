'use client'
import { useState } from 'react'

export default function SetupPage() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('done')
        setMessage(data.message)
      } else {
        setStatus('error')
        setMessage(data.error)
      }
    } catch (err) {
      setStatus('error')
      setMessage(String(err))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Notofire DB Setup</h1>
        <p className="text-gray-400 text-sm mb-6">
          Enter your Supabase database password to apply the schema.
          Find it in:{' '}
          <span className="text-orange-400">
            Supabase Dashboard → Settings → Database → Connection string
          </span>
        </p>

        {status === 'done' ? (
          <div className="bg-green-900/40 border border-green-700 rounded-lg p-4 text-green-300">
            <p className="font-semibold">Schema applied!</p>
            <p className="text-sm mt-1">{message}</p>
            <p className="text-sm mt-3 text-gray-400">
              Next: go to Supabase Dashboard → Authentication → Users, create an admin user, then update their role:
            </p>
            <code className="block mt-2 text-xs bg-gray-800 rounded p-2 text-orange-300">
              UPDATE profiles SET role = &apos;admin&apos; WHERE email = &apos;your@email.com&apos;;
            </code>
            <a href="/login" className="mt-4 inline-block bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
              Go to Login →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Database Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter Supabase DB password"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {status === 'error' && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !password}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 transition-colors"
            >
              {status === 'loading' ? 'Applying schema...' : 'Apply Database Schema'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
