import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import GameTrackView from './GameTrackView'
import '../admin.css'

export default function ClubOppView({ profile, onLogout }) {
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  useEffect(() => {
    if (profile.can_open_games && profile.club_id) loadGames()
  }, [profile.club_id, profile.can_open_games])

  async function loadGames() {
    const { data: escData } = await supabase.from('escaloes').select('id').eq('club_id', profile.club_id)
    const escalaoIds = (escData || []).map((e) => e.id)
    if (!escalaoIds.length) { setGames([]); return }

    const { data } = await supabase
      .from('games')
      .select('*, escaloes(id, name, modality_id)')
      .in('escalao_id', escalaoIds)
      .order('game_date', { ascending: false })
    setGames(data || [])
  }

  if (selectedGame) {
    return <GameTrackView game={selectedGame} onBack={() => setSelectedGame(null)} onLogout={onLogout} isOnline={isOnline} userRole={profile.role} />
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo">GamTrackr</span>
          <span className="admin-role-badge">Club Opp</span>
        </div>
        <div className="admin-header-right">
          <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>● {isOnline ? 'Online' : 'Offline'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="admin-main" style={{ maxWidth: 860 }}>
        {!profile.can_open_games ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#374151', margin: '0 0 0.5rem' }}>Sem autorização</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Não tens permissão para abrir jogos. Contacta o administrador do clube.</p>
          </div>
        ) : (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Jogos</h2>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{games.length} jogo{games.length !== 1 ? 's' : ''}</span>
            </div>

            {games.length === 0 ? (
              <div className="admin-empty">Não há jogos disponíveis.</div>
            ) : (
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Data</th>
                      <th>Plantel</th>
                      <th>Adversário</th>
                      <th className="col-center" style={{ width: 100 }}>Estado</th>
                      <th className="col-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((g) => (
                      <tr key={g.id}>
                        <td className="cell-muted">{new Date(g.game_date).toLocaleDateString('pt-PT')}</td>
                        <td className="cell-muted">{g.escaloes?.name}</td>
                        <td className="cell-primary">{g.opponent}</td>
                        <td className="col-center">
                          {g.status === 'finished'
                            ? <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: 20 }}>Encerrado</span>
                            : <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: 20 }}>Activo</span>}
                        </td>
                        <td className="col-actions">
                          <button className="btn btn-sm btn-success" onClick={() => setSelectedGame(g)}>▶ Abrir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
