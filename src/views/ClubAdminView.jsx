import { useState, useEffect } from 'react'
import GameTrackView from './GameTrackView'
import { EscaloesManager, PlayersManager, GamesManager, OperadoresManager } from './ClubManagers'
import '../admin.css'

const NAV = [
  { key: 'escaloes',   icon: '🏅', label: 'Escalões' },
  { key: 'jogadores',  icon: '👤', label: 'Jogadores' },
  { key: 'jogos',      icon: '📅', label: 'Jogos' },
  { key: 'operadores', icon: '🎮', label: 'Operadores' },
]

export default function ClubAdminView({ profile, onLogout }) {
  const [tab, setTab] = useState('jogos')
  const [selectedGame, setSelectedGame] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  if (!profile.club_id) {
    return (
      <div className="admin-shell">
        <header className="admin-header">
          <div className="admin-header-left"><span className="admin-logo">GamTrackr</span></div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sair</button>
        </header>
        <main style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p>A tua conta ainda não tem um clube associado.<br />Contacta o super administrador.</p>
        </main>
      </div>
    )
  }

  if (selectedGame) {
    return <GameTrackView game={selectedGame} onBack={() => setSelectedGame(null)} onLogout={onLogout} isOnline={isOnline} userRole={profile.role} />
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo">GamTrackr</span>
          <span className="admin-role-badge">Admin Club</span>
        </div>
        <div className="admin-header-right">
          <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>● {isOnline ? 'Online' : 'Offline'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sair</button>
        </div>
      </header>
      <div className="admin-body">
        <nav className="admin-sidebar">
          <div className="admin-nav-section">Gestão do Clube</div>
          {NAV.map(({ key, icon, label }) => (
            <button key={key} className={`admin-nav-item${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              <span className="admin-nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <main className="admin-main">
          {tab === 'escaloes'   && <EscaloesManager   clubId={profile.club_id} />}
          {tab === 'jogadores'  && <PlayersManager    clubId={profile.club_id} />}
          {tab === 'jogos'      && <GamesManager      clubId={profile.club_id} onSelectGame={setSelectedGame} />}
          {tab === 'operadores' && <OperadoresManager clubId={profile.club_id} />}
        </main>
      </div>
    </div>
  )
}
