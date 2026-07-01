import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LoginView({ onLogin, loginError }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setLoading(true)

    let email = identifier.trim()

    // Se não contém @ é um username — resolver para email
    if (!email.includes('@')) {
      const { data, error } = await supabase.rpc('get_email_by_username', {
        p_username: email.toLowerCase(),
      })
      if (error || !data) {
        setLocalError('Utilizador não encontrado.')
        setLoading(false)
        return
      }
      email = data
    }

    await onLogin(email, password)
    setLoading(false)
  }

  const error = localError || loginError

  return (
    <div className="min-h-screen bg-[#070c14] flex items-center justify-center relative overflow-hidden px-4">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-900/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/gamtrakr-logo.png"
            alt="GamTrakr"
            className="mx-auto mb-2 drop-shadow-[0_0_32px_rgba(56,189,248,0.35)]"
            style={{ maxHeight: 400, width: 'auto' }}
          />
          <p className="text-slate-500 mt-3 text-sm font-medium tracking-wide">Every Play. Every Moment.</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/40">
          <h2 className="text-lg font-bold text-white mb-6">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[0.68rem] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Email ou Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="utilizador ou email@exemplo.com"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[0.68rem] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 mt-2"
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          GamTrakr © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
