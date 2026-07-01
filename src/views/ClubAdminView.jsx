import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import GameTrackView from './GameTrackView'
import '../admin.css'

const NAV = [
  { key: 'escaloes',  icon: '🏅', label: 'Escalões' },
  { key: 'planteis',  icon: '👥', label: 'Plantéis' },
  { key: 'jogadores', icon: '👤', label: 'Jogadores' },
  { key: 'jogos',     icon: '📅', label: 'Jogos' },
]

export default function ClubAdminView({ profile, onLogout }) {
  const [tab, setTab] = useState('jogos')
  const [selectedGame, setSelectedGame] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
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
    return <GameTrackView game={selectedGame} onBack={() => setSelectedGame(null)} onLogout={onLogout} isOnline={isOnline} />
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-left"><span className="admin-logo">GamTrackr</span></div>
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
          {tab === 'escaloes'  && <EscaloesManager  clubId={profile.club_id} />}
          {tab === 'planteis'  && <PlanteisManager  clubId={profile.club_id} />}
          {tab === 'jogadores' && <PlayersManager   clubId={profile.club_id} />}
          {tab === 'jogos'     && <GamesManager     clubId={profile.club_id} onSelectGame={setSelectedGame} />}
        </main>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getEscalaoIds(clubId) {
  const { data } = await supabase.from('escaloes').select('id').eq('club_id', clubId)
  return (data || []).map((e) => e.id)
}

async function getTeamIds(escalaoIds) {
  if (!escalaoIds.length) return []
  const { data } = await supabase.from('teams').select('id').in('escalao_id', escalaoIds)
  return (data || []).map((t) => t.id)
}

function req(label) {
  return <>{label} <span className="required-mark">*</span></>
}

function Field({ label, required, error, children }) {
  return (
    <div className="admin-field">
      <label className="admin-label">{required ? req(label) : label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

// ── Escalões ──────────────────────────────────────────────────────────────────

const EMPTY_ESC = { name: '', modality_id: '' }

function EscaloesManager({ clubId }) {
  const [escaloes, setEscaloes] = useState([])
  const [modalities, setModalities] = useState([])
  const [form, setForm] = useState(EMPTY_ESC)
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    load()
    supabase.from('modalities').select('*').order('name').then(({ data }) => setModalities(data || []))
  }, [clubId])

  async function load() {
    const { data } = await supabase.from('escaloes').select('*, modalities(name)').eq('club_id', clubId).order('name')
    setEscaloes(data || [])
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    if (!form.modality_id) e.modality_id = 'Campo obrigatório'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    const payload = { name: form.name, modality_id: form.modality_id, club_id: clubId }
    if (editing) {
      await supabase.from('escaloes').update(payload).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('escaloes').insert(payload)
    }
    setForm(EMPTY_ESC); setErrors({}); load()
  }

  function startEdit(e) { setEditing(e); setForm({ name: e.name, modality_id: e.modality_id }); setErrors({}) }
  function cancel() { setEditing(null); setForm(EMPTY_ESC); setErrors({}) }

  async function remove(id) {
    if (!confirm('Eliminar escalão?')) return
    await supabase.from('escaloes').delete().eq('id', id)
    load()
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Escalões</h2>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{escaloes.length} registo{escaloes.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={`admin-form-section${editing ? ' is-editing' : ''}`}>
        <span className="admin-form-label">{editing ? 'Editar escalão' : 'Novo escalão'}</span>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Nome" required error={errors.name}>
            <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Sub-17" />
          </Field>
          <Field label="Modalidade" required error={errors.modality_id}>
            <select className={`admin-select${errors.modality_id ? ' input-error' : ''}`} value={form.modality_id} onChange={(e) => setForm({ ...form, modality_id: e.target.value })}>
              <option value="">Selecionar…</option>
              {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="admin-form-footer">
          {editing && <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
          <button className="btn btn-primary" onClick={save}>{editing ? 'Guardar alterações' : 'Adicionar escalão'}</button>
        </div>
      </div>

      {escaloes.length === 0 ? <div className="admin-empty">Ainda não há escalões registados.</div> : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Nome</th><th>Modalidade</th><th className="col-right">Ações</th></tr></thead>
            <tbody>
              {escaloes.map((e) => (
                <tr key={e.id}>
                  <td className="cell-primary">{e.name}</td>
                  <td className="cell-muted">{e.modalities?.name}</td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(e)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(e.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Plantéis ──────────────────────────────────────────────────────────────────

function PlanteisManager({ clubId }) {
  const [teams, setTeams] = useState([])
  const [escaloes, setEscaloes] = useState([])
  const [form, setForm] = useState({ name: '', escalao_id: '' })
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => { loadEscaloes() }, [clubId])

  async function loadEscaloes() {
    const { data } = await supabase.from('escaloes').select('*').eq('club_id', clubId).order('name')
    setEscaloes(data || [])
    load((data || []).map((e) => e.id))
  }

  async function load(escalaoIds) {
    if (!escalaoIds.length) { setTeams([]); return }
    const { data } = await supabase.from('teams').select('*, escaloes(name)').in('escalao_id', escalaoIds).order('name')
    setTeams(data || [])
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    if (!form.escalao_id) e.escalao_id = 'Campo obrigatório'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    const payload = { name: form.name, escalao_id: form.escalao_id }
    if (editing) {
      await supabase.from('teams').update(payload).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('teams').insert(payload)
    }
    setForm({ name: '', escalao_id: '' }); setErrors({}); loadEscaloes()
  }

  function startEdit(t) { setEditing(t); setForm({ name: t.name, escalao_id: t.escalao_id || '' }); setErrors({}) }
  function cancel() { setEditing(null); setForm({ name: '', escalao_id: '' }); setErrors({}) }

  async function remove(id) {
    if (!confirm('Eliminar plantel?')) return
    await supabase.from('teams').delete().eq('id', id)
    loadEscaloes()
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Plantéis</h2>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{teams.length} registo{teams.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={`admin-form-section${editing ? ' is-editing' : ''}`}>
        <span className="admin-form-label">{editing ? 'Editar plantel' : 'Novo plantel'}</span>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Nome" required error={errors.name}>
            <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Seniores A" />
          </Field>
          <Field label="Escalão" required error={errors.escalao_id}>
            <select className={`admin-select${errors.escalao_id ? ' input-error' : ''}`} value={form.escalao_id} onChange={(e) => setForm({ ...form, escalao_id: e.target.value })}>
              <option value="">Selecionar…</option>
              {escaloes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="admin-form-footer">
          {editing && <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
          <button className="btn btn-primary" onClick={save}>{editing ? 'Guardar alterações' : 'Adicionar plantel'}</button>
        </div>
      </div>

      {teams.length === 0 ? <div className="admin-empty">Ainda não há plantéis registados.</div> : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Nome</th><th>Escalão</th><th className="col-right">Ações</th></tr></thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td className="cell-primary">{t.name}</td>
                  <td className="cell-muted">{t.escaloes?.name}</td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(t)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Jogadores ─────────────────────────────────────────────────────────────────

function PlayersManager({ clubId }) {
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [form, setForm] = useState({ name: '', number: '' })
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => { loadTeams() }, [clubId])

  async function loadTeams() {
    const escalaoIds = await getEscalaoIds(clubId)
    if (!escalaoIds.length) { setTeams([]); return }
    const { data } = await supabase.from('teams').select('*').in('escalao_id', escalaoIds).order('name')
    setTeams(data || [])
  }

  async function loadPlayers(teamId) {
    if (!teamId) { setPlayers([]); return }
    const { data } = await supabase.from('players').select('*').eq('team_id', teamId).order('number')
    setPlayers(data || [])
  }

  function handleTeamChange(teamId) {
    setSelectedTeamId(teamId); setEditing(null); setForm({ name: '', number: '' }); setErrors({}); loadPlayers(teamId)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    const payload = { name: form.name, number: parseInt(form.number) || 0, team_id: selectedTeamId }
    if (editing) {
      await supabase.from('players').update(payload).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('players').insert(payload)
    }
    setForm({ name: '', number: '' }); setErrors({}); loadPlayers(selectedTeamId)
  }

  function startEdit(p) { setEditing(p); setForm({ name: p.name, number: String(p.number) }); setErrors({}) }
  function cancel() { setEditing(null); setForm({ name: '', number: '' }); setErrors({}) }

  async function remove(id) {
    if (!confirm('Eliminar jogador?')) return
    await supabase.from('players').delete().eq('id', id)
    loadPlayers(selectedTeamId)
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Jogadores</h2>
        {selectedTeamId && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{players.length} jogador{players.length !== 1 ? 'es' : ''}</span>}
      </div>

      <div className="admin-filter-bar">
        <div className="admin-field-fixed">
          <label className="admin-label">Plantel</label>
          <select className="admin-select" value={selectedTeamId} onChange={(e) => handleTeamChange(e.target.value)}>
            <option value="">Selecionar…</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedTeamId ? (
        <div className="admin-prompt"><span style={{ fontSize: '2rem' }}>☝️</span><p>Seleciona um plantel para ver e gerir os seus jogadores.</p></div>
      ) : (
        <>
          <div className={`admin-form-section${editing ? ' is-editing' : ''}`}>
            <span className="admin-form-label">{editing ? 'Editar jogador' : 'Novo jogador'}</span>
            <div className="admin-form-grid" style={{ gridTemplateColumns: '100px 1fr' }}>
              <Field label="Nº">
                <input className="admin-input" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="10" />
              </Field>
              <Field label="Nome" required error={errors.name}>
                <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: João Silva" />
              </Field>
            </div>
            <div className="admin-form-footer">
              {editing && <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
              <button className="btn btn-primary" onClick={save}>{editing ? 'Guardar alterações' : 'Adicionar jogador'}</button>
            </div>
          </div>

          {players.length === 0 ? <div className="admin-empty">Ainda não há jogadores neste plantel.</div> : (
            <div className="table-scroll">
              <table className="admin-table">
                <thead><tr><th style={{ width: 60 }} className="col-center">Nº</th><th>Nome</th><th className="col-right">Ações</th></tr></thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td className="col-center" style={{ fontWeight: 700, color: '#94a3b8' }}>#{p.number}</td>
                      <td className="cell-primary">{p.name}</td>
                      <td className="col-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => startEdit(p)}>Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Jogos ─────────────────────────────────────────────────────────────────────

const EMPTY_GAME = { team_id: '', opponent: '', game_date: '' }

function GamesManager({ clubId, onSelectGame }) {
  const [games, setGames] = useState([])
  const [teams, setTeams] = useState([])
  const [form, setForm] = useState(EMPTY_GAME)
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => { init() }, [clubId])

  async function init() {
    const escalaoIds = await getEscalaoIds(clubId)
    const teamIds = await getTeamIds(escalaoIds)
    if (!teamIds.length) { setTeams([]); setGames([]); return }
    const { data: teamsData } = await supabase.from('teams').select('*').in('id', teamIds).order('name')
    setTeams(teamsData || [])
    loadGames(teamIds)
  }

  async function loadGames(teamIds) {
    if (!teamIds.length) { setGames([]); return }
    const { data } = await supabase.from('games').select('*, teams(id, name)').in('team_id', teamIds).order('game_date', { ascending: false })
    setGames(data || [])
  }

  function validate() {
    const e = {}
    if (!form.team_id) e.team_id = 'Campo obrigatório'
    if (!form.opponent.trim()) e.opponent = 'Campo obrigatório'
    if (!form.game_date) e.game_date = 'Campo obrigatório'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    const payload = { team_id: form.team_id, opponent: form.opponent, game_date: form.game_date }
    if (editing) {
      await supabase.from('games').update(payload).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('games').insert(payload)
    }
    setForm({ ...EMPTY_GAME, team_id: form.team_id }); setErrors({}); init()
  }

  function startEdit(g) { setEditing(g); setForm({ team_id: g.team_id || '', opponent: g.opponent, game_date: (g.game_date || '').slice(0, 10) }); setErrors({}) }
  function cancel() { setEditing(null); setForm(EMPTY_GAME); setErrors({}) }

  async function remove(id) {
    if (!confirm('Eliminar jogo?')) return
    await supabase.from('games').delete().eq('id', id)
    init()
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Jogos</h2>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{games.length} jogo{games.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={`admin-form-section${editing ? ' is-editing' : ''}`}>
        <span className="admin-form-label">{editing ? 'Editar jogo' : 'Novo jogo'}</span>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <Field label="Plantel" required error={errors.team_id}>
            <select className={`admin-select${errors.team_id ? ' input-error' : ''}`} value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
              <option value="">Selecionar…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Adversário" required error={errors.opponent}>
            <input className={`admin-input${errors.opponent ? ' input-error' : ''}`} value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="Ex: FC Porto" />
          </Field>
          <Field label="Data" required error={errors.game_date}>
            <input className={`admin-input${errors.game_date ? ' input-error' : ''}`} type="date" value={form.game_date} onChange={(e) => setForm({ ...form, game_date: e.target.value })} />
          </Field>
        </div>
        <div className="admin-form-footer">
          {editing && <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
          <button className="btn btn-primary" onClick={save}>{editing ? 'Guardar alterações' : 'Adicionar jogo'}</button>
        </div>
      </div>

      {games.length === 0 ? <div className="admin-empty">Ainda não há jogos registados.</div> : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Data</th>
                <th>Plantel</th>
                <th>Adversário</th>
                <th className="col-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td className="cell-muted">{new Date(g.game_date).toLocaleDateString('pt-PT')}</td>
                  <td className="cell-muted">{g.teams?.name}</td>
                  <td className="cell-primary">{g.opponent}</td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-success" onClick={() => onSelectGame(g)}>▶ Registar</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(g)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(g.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
