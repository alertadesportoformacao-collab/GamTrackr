import { useState } from 'react'

export default function LoginView({ onLogin, loginError }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <CourtBg />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 18, padding: '2.5rem 2.25rem',
        width: '100%', maxWidth: 380,
        boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
        margin: '1rem',
      }}>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #0f2744 0%, #1d4ed8 100%)',
            marginBottom: '0.875rem',
            boxShadow: '0 8px 24px rgba(15,39,68,0.35)',
          }}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>⚽</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
            GamTrackr
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.3rem', fontWeight: 500 }}>
            Plataforma de Registo Desportivo
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password) }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelSt}>Email</label>
            <input
              type="email" autoFocus autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="utilizador@exemplo.com"
              style={inputSt}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e)  => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelSt}>Password</label>
            <input
              type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputSt}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e)  => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {loginError && (
            <p style={{
              margin: '0 0 1rem', fontSize: '0.84rem', color: '#dc2626',
              background: '#fef2f2', border: '1px solid #fecaca',
              padding: '0.6rem 0.85rem', borderRadius: 8, fontWeight: 500,
            }}>
              {loginError}
            </p>
          )}

          <button type="submit" style={{
            width: '100%', padding: '0.75rem',
            background: 'linear-gradient(135deg, #0f2744 0%, #1d4ed8 100%)',
            color: 'white', border: 'none', borderRadius: 10,
            fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.01em',
            boxShadow: '0 4px 14px rgba(29,78,216,0.4)',
            transition: 'opacity 0.15s',
          }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e)  => e.currentTarget.style.opacity = '1'}
          >
            Entrar
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
          GamTrackr © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelSt = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700,
  color: '#374151', marginBottom: '0.4rem',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const inputSt = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.65rem 0.9rem',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: '0.92rem', color: '#0f172a', outline: 'none',
  fontFamily: 'inherit', background: 'white',
  transition: 'border-color 0.15s',
}

// ── Futsal court SVG background ───────────────────────────────────────────────

function CourtBg() {
  return (
    <svg
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        {/* Spotlight from above */}
        <radialGradient id="spot" cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
        </radialGradient>
        {/* Vignette */}
        <radialGradient id="vig" cx="50%" cy="50%" r="70%">
          <stop offset="40%"  stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
        </radialGradient>
        {/* Line glow filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Sky/stadium background */}
      <rect width="1200" height="700" fill="#061520" />

      {/* Field strips (alternating shades) */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={100 + i * 100} y="100" width="100" height="500"
          fill={i % 2 === 0 ? '#1b4d1b' : '#174417'} />
      ))}

      {/* ── Court markings ── */}
      <g filter="url(#glow)" stroke="rgba(255,255,255,0.82)" fill="none" strokeLinecap="round">

        {/* Outer boundary */}
        <rect x="100" y="100" width="1000" height="500" strokeWidth="4" />

        {/* Center line */}
        <line x1="600" y1="100" x2="600" y2="600" strokeWidth="3" />

        {/* Center circle (r = 3m → 75px) */}
        <circle cx="600" cy="350" r="75" strokeWidth="3" />

        {/* Left goal area (6m arc from posts at y=275 & y=425) */}
        <path d="M 100,275 A 150,150 0 0,1 100,425" strokeWidth="3"
          fill="rgba(255,255,255,0.04)" />

        {/* Right goal area */}
        <path d="M 1100,275 A 150,150 0 0,0 1100,425" strokeWidth="3"
          fill="rgba(255,255,255,0.04)" />

        {/* Left goal (3m × 2m → 75px × 50px) */}
        <rect x="50" y="275" width="50" height="150" strokeWidth="3"
          fill="rgba(255,255,255,0.06)" />

        {/* Right goal */}
        <rect x="1100" y="275" width="50" height="150" strokeWidth="3"
          fill="rgba(255,255,255,0.06)" />

      </g>

      {/* Spots & dots (no glow filter — crisp) */}
      {/* Center spot */}
      <circle cx="600" cy="350" r="5" fill="rgba(255,255,255,0.82)" />
      {/* Left penalty spot (6m) */}
      <circle cx="250" cy="350" r="5" fill="rgba(255,255,255,0.82)" />
      {/* Left 2nd penalty spot (10m) */}
      <circle cx="350" cy="350" r="5" fill="rgba(255,255,255,0.82)" />
      {/* Right penalty spot */}
      <circle cx="950" cy="350" r="5" fill="rgba(255,255,255,0.82)" />
      {/* Right 2nd penalty spot */}
      <circle cx="850" cy="350" r="5" fill="rgba(255,255,255,0.82)" />

      {/* Spotlight overlay */}
      <rect width="1200" height="700" fill="url(#spot)" />
      {/* Vignette */}
      <rect width="1200" height="700" fill="url(#vig)" />
    </svg>
  )
}
