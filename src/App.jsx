import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [games, setGames] = useState([])
  const [eventTypes, setEventTypes] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    async function loadData() {
      const { data: gamesData } = await supabase.from('games').select('*, teams(name)')
      const { data: eventTypesData } = await supabase.from('event_types').select('*').order('sort_order')
      setGames(gamesData || [])
      setEventTypes(eventTypesData || [])
    }
    loadData()
  }, [session])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError(error.message)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 320 }}>
        <h1>GamTrackr</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.5rem 1rem' }}>Entrar</button>
        </form>
        {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>GamTrackr</h1>
        <button onClick={handleLogout}>Sair</button>
      </div>

      <h2>Jogos</h2>
      <ul>
        {games.map((g) => (
          <li key={g.id}>
            {g.teams?.name} vs {g.opponent} — {new Date(g.game_date).toLocaleString('pt-PT')}
          </li>
        ))}
      </ul>

      <h2>Tipos de evento (Futsal)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {eventTypes.map((et) => (
          <button
            key={et.id}
            style={{
              backgroundColor: et.color,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '1rem',
              minWidth: '100px',
            }}
          >
            {et.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App