import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import SuperAdminView from './views/SuperAdminView'
import ClubAdminView from './views/ClubAdminView'
import ClubOppView from './views/ClubOppView'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
      else setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError(error.message)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>A carregar...</div>
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 320 }}>
        <h1>GamTrackr</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ padding: '0.5rem 1rem' }}>Entrar</button>
        </form>
        {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <p>Perfil não encontrado. Contacta o administrador do sistema.</p>
        <button onClick={handleLogout}>Sair</button>
      </div>
    )
  }

  if (profile.role === 'super_admin') return <SuperAdminView onLogout={handleLogout} />
  if (profile.role === 'admin_club')  return <ClubAdminView  profile={profile} onLogout={handleLogout} />
  if (profile.role === 'club_opp')   return <ClubOppView    profile={profile} onLogout={handleLogout} />

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <p>Papel desconhecido: <code>{profile.role}</code>. Contacta o administrador.</p>
      <button onClick={handleLogout}>Sair</button>
    </div>
  )
}

export default App
