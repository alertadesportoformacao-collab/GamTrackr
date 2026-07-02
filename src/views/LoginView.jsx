import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../LanguageContext'

export default function LoginView({ onLogin, loginError }) {
  const { t, lang, setLanguage, languages } = useLanguage()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setLoading(true)

    let email = identifier.trim()

    if (!email.includes('@')) {
      const { data, error } = await supabase.rpc('get_email_by_username', {
        p_username: email.toLowerCase(),
      })
      if (error || !data) {
        setLocalError(t('login.user_not_found'))
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'var(--bg)' }}>

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
        <div className="text-center mb-6">
          <img
            src="/gamtrakr-logo.png"
            alt="GamTrakr"
            className="mx-auto mb-2 drop-shadow-[0_0_32px_rgba(56,189,248,0.35)]"
            style={{ maxHeight: 400, width: 'auto' }}
          />
          <p className="mt-3 text-sm font-medium tracking-wide" style={{ color: 'var(--tx4)' }}>
            {t('login.subtitle')}
          </p>
        </div>

        {/* Language selector */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-5">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              title={l.label}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
              style={{
                background: lang === l.code ? 'rgba(14,165,233,0.2)' : 'var(--inp)',
                color: lang === l.code ? '#38bdf8' : 'var(--tx4)',
                border: `1px solid ${lang === l.code ? 'rgba(14,165,233,0.4)' : 'var(--bd)'}`,
                cursor: 'pointer',
              }}
            >
              <span>{l.flag}</span>
              <span>{l.short}</span>
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-black/40"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[0.68rem] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--tx4)' }}>
                {t('login.identifier')}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder={t('login.identifier_ph')}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{
                  background: 'var(--inp)',
                  border: '1px solid var(--bd3)',
                  color: 'var(--tx)',
                }}
              />
            </div>

            <div>
              <label className="block text-[0.68rem] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--tx4)' }}>
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={t('login.password_ph')}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{
                  background: 'var(--inp)',
                  border: '1px solid var(--bd3)',
                  color: 'var(--tx)',
                }}
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#0ea5e9' }}
            >
              {loading ? t('login.loading') : t('login.submit')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--tx5)' }}>
          {t('footer.copy', new Date().getFullYear())}
        </p>
      </div>
    </div>
  )
}
