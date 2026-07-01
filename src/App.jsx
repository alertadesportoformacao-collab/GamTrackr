import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import AppShell from './components/AppShell'
import LoginView from './views/LoginView'
import { ThemeProvider } from './ThemeContext'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
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

  async function handleLogin(email, password) {
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
    return <LoginView onLogin={handleLogin} loginError={loginError} />
  }

  if (!profile) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <p>Perfil não encontrado. Contacta o administrador do sistema.</p>
        <button onClick={handleLogout}>Sair</button>
      </div>
    )
  }

  if (['super_admin', 'admin_club', 'club_opp'].includes(profile.role))
    return <AppShell profile={profile} onLogout={handleLogout} />

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <p>Papel desconhecido: <code>{profile.role}</code>. Contacta o administrador.</p>
      <button onClick={handleLogout}>Sair</button>
    </div>
  )
}

function AppWithTheme() {
  return <ThemeProvider><App /></ThemeProvider>
}

export default AppWithTheme
