import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import GameTrackView from './GameTrackView'
import { EscaloesManager, PlayersManager, GamesManager, OperadoresManager } from './ClubManagers'
import '../admin.css'

const GLOBAL_NAV = [
  { key: 'clubs',      icon: '🏢', label: 'Clubes' },
  { key: 'modalities', icon: '⚽', label: 'Modalidades' },
  { key: 'eventTypes', icon: '🎯', label: 'Tipos de Evento' },
  { key: 'users',      icon: '👤', label: 'Utilizadores' },
]

const CLUB_NAV = [
  { key: 'escaloes',   icon: '🏅', label: 'Escalões' },
  { key: 'jogadores',  icon: '👤', label: 'Jogadores' },
  { key: 'jogos',      icon: '📅', label: 'Jogos' },
  { key: 'operadores', icon: '🎮', label: 'Operadores' },
]

const CLUB_TABS = new Set(['escaloes', 'jogadores', 'jogos', 'operadores'])

export default function SuperAdminView({ onLogout }) {
  const [tab, setTab]                   = useState('clubs')
  const [clubs, setClubs]               = useState([])
  const [managedClubId, setManagedClubId] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)
  const [isOnline, setIsOnline]         = useState(navigator.onLine)

  useEffect(() => {
    supabase.from('clubs').select('*').order('name').then(({ data }) => setClubs(data || []))
  }, [])

  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  if (selectedGame) {
    return <GameTrackView game={selectedGame} onBack={() => setSelectedGame(null)} onLogout={onLogout} isOnline={isOnline} userRole="super_admin" />
  }

  const managedClub = clubs.find((c) => c.id === managedClubId)

  function switchTab(key) {
    setTab(key)
    // clear game tracking when navigating away
    if (selectedGame) setSelectedGame(null)
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo">GamTrackr</span>
          <span className="admin-role-badge">Super Admin</span>
        </div>
        <div className="admin-header-right">
          <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>● {isOnline ? 'Online' : 'Offline'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-sidebar">
          <div className="admin-nav-section">Gestão Global</div>
          {GLOBAL_NAV.map(({ key, icon, label }) => (
            <button key={key} className={`admin-nav-item${tab === key ? ' active' : ''}`} onClick={() => switchTab(key)}>
              <span className="admin-nav-icon">{icon}</span>{label}
            </button>
          ))}

          <div className="admin-nav-section" style={{ marginTop: '0.75rem' }}>Gerir Clube</div>

          {/* Club selector inline in sidebar */}
          <div style={{ padding: '0 0.75rem 0.5rem' }}>
            <select
              className="admin-select"
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', width: '100%' }}
              value={managedClubId}
              onChange={(e) => setManagedClubId(e.target.value)}
            >
              <option value="">Selecionar clube…</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {CLUB_NAV.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`admin-nav-item${tab === key ? ' active' : ''}`}
              onClick={() => switchTab(key)}
              disabled={!managedClubId}
              title={!managedClubId ? 'Seleciona um clube primeiro' : ''}
              style={{ opacity: managedClubId ? 1 : 0.4 }}
            >
              <span className="admin-nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>

        <main className="admin-main">
          {/* Global managers */}
          {tab === 'clubs'      && <ClubsManager onClubsChange={setClubs} />}
          {tab === 'modalities' && <ModalitiesManager />}
          {tab === 'eventTypes' && <EventTypesManager />}
          {tab === 'users'      && <UsersManager />}

          {/* Club managers — require a club to be selected */}
          {CLUB_TABS.has(tab) && !managedClubId && (
            <div className="admin-prompt">
              <span style={{ fontSize: '2rem' }}>🏢</span>
              <p>Seleciona um clube na barra lateral para gerir os seus dados.</p>
            </div>
          )}
          {CLUB_TABS.has(tab) && managedClubId && (
            <>
              {/* Club context banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1.25rem', padding: '0.6rem 1rem',
                background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe',
              }}>
                <span style={{ fontSize: '1rem' }}>🏢</span>
                <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>{managedClub?.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: 'auto' }}>
                  A gerir como Super Admin
                </span>
              </div>

              {tab === 'escaloes'   && <EscaloesManager   clubId={managedClubId} />}
              {tab === 'jogadores'  && <PlayersManager    clubId={managedClubId} />}
              {tab === 'jogos'      && <GamesManager      clubId={managedClubId} onSelectGame={setSelectedGame} />}
              {tab === 'operadores' && <OperadoresManager clubId={managedClubId} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function req(label) { return <>{label} <span className="required-mark">*</span></> }

function Field({ label, required, error, children }) {
  return (
    <div className="admin-field">
      <label className="admin-label">{required ? req(label) : label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel = 'Guardar' }) {
  return (
    <div className="admin-form-footer" style={{ marginTop: '1.25rem' }}>
      <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? 'A guardar…' : saveLabel}
      </button>
    </div>
  )
}

// ── Clubes ────────────────────────────────────────────────────────────────────

function ClubsManager({ onClubsChange }) {
  const [clubs, setClubs] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('clubs').select('*').order('name')
    setClubs(data || [])
    onClubsChange?.(data || [])
  }

  function openNew()  { setEditing(null); setName(''); setErrors({}); setOpen(true) }
  function openEdit(c){ setEditing(c); setName(c.name); setErrors({}); setOpen(true) }
  function close()    { setOpen(false) }

  async function save() {
    const e = {}; if (!name.trim()) e.name = 'Campo obrigatório'
    setErrors(e); if (Object.keys(e).length) return
    editing
      ? await supabase.from('clubs').update({ name }).eq('id', editing.id)
      : await supabase.from('clubs').insert({ name })
    close(); load()
  }

  async function remove(id) {
    if (!confirm('Eliminar clube?')) return
    await supabase.from('clubs').delete().eq('id', id); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? 'Editar clube' : 'Novo clube'} width={420}>
        <Field label="Nome" required error={errors.name}>
          <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Sporting CP" />
        </Field>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? 'Guardar' : 'Adicionar'} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Clubes</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>+ Novo</button>
        </div>
        {clubs.length === 0 ? <div className="admin-empty">Ainda não há clubes registados.</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th>Nome</th><th className="col-right">Ações</th></tr></thead>
              <tbody>
                {clubs.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-primary">{c.name}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── Modalidades ───────────────────────────────────────────────────────────────

function ModalitiesManager() {
  const [modalities, setModalities] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('modalities').select('*').order('name')
    setModalities(data || [])
  }

  function openNew()  { setEditing(null); setName(''); setErrors({}); setOpen(true) }
  function openEdit(m){ setEditing(m); setName(m.name); setErrors({}); setOpen(true) }
  function close()    { setOpen(false) }

  async function save() {
    const e = {}; if (!name.trim()) e.name = 'Campo obrigatório'
    setErrors(e); if (Object.keys(e).length) return
    editing
      ? await supabase.from('modalities').update({ name }).eq('id', editing.id)
      : await supabase.from('modalities').insert({ name })
    close(); load()
  }

  async function remove(id) {
    if (!confirm('Eliminar modalidade?')) return
    await supabase.from('modalities').delete().eq('id', id); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? 'Editar modalidade' : 'Nova modalidade'} width={420}>
        <Field label="Nome" required error={errors.name}>
          <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Futsal" />
        </Field>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? 'Guardar' : 'Adicionar'} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Modalidades</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>+ Nova</button>
        </div>
        {modalities.length === 0 ? <div className="admin-empty">Ainda não há modalidades registadas.</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th>Nome</th><th className="col-right">Ações</th></tr></thead>
              <tbody>
                {modalities.map((m) => (
                  <tr key={m.id}>
                    <td className="cell-primary">{m.name}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(m)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(m.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── Tipos de Evento ───────────────────────────────────────────────────────────

const EMPTY_ET = { name: '', color: '#3b82f6', sort_order: '', registro_tipo: 'realtime', requer_jogador: true }

function EventTypesManager() {
  const [eventTypes, setEventTypes] = useState([])
  const [modalities, setModalities] = useState([])
  const [selectedModalityId, setSelectedModalityId] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_ET)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    supabase.from('modalities').select('*').order('name').then(({ data }) => setModalities(data || []))
  }, [])

  async function load(id) {
    if (!id) { setEventTypes([]); return }
    const { data } = await supabase.from('event_types').select('*').eq('modality_id', id).order('sort_order')
    setEventTypes(data || [])
  }

  function handleModalityChange(id) { setSelectedModalityId(id); load(id) }

  function openNew() { setEditing(null); setForm(EMPTY_ET); setErrors({}); setOpen(true) }
  function openEdit(et) {
    setEditing(et)
    setForm({
      name: et.name, color: et.color, sort_order: String(et.sort_order ?? ''),
      registro_tipo: et.registro_tipo || 'realtime',
      requer_jogador: et.requer_jogador !== false,
    })
    setErrors({})
    setOpen(true)
  }
  function close() { setOpen(false) }

  async function save() {
    const e = {}; if (!form.name.trim()) e.name = 'Campo obrigatório'
    setErrors(e); if (Object.keys(e).length) return
    const payload = {
      name: form.name, color: form.color,
      sort_order: parseInt(form.sort_order) || 0,
      modality_id: selectedModalityId,
      registro_tipo: form.registro_tipo,
      requer_jogador: form.requer_jogador,
    }
    editing
      ? await supabase.from('event_types').update(payload).eq('id', editing.id)
      : await supabase.from('event_types').insert(payload)
    close(); load(selectedModalityId)
  }

  async function remove(id) {
    if (!confirm('Eliminar tipo de evento?')) return
    await supabase.from('event_types').delete().eq('id', id); load(selectedModalityId)
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? 'Editar evento' : 'Novo tipo de evento'} width={480}>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 72px 90px' }}>
          <Field label="Nome" required error={errors.name}>
            <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Golo" />
          </Field>
          <div className="admin-color-field">
            <label className="admin-label">Cor</label>
            <input type="color" className="admin-color-input" value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: '100%' }} />
          </div>
          <Field label="Ordem">
            <input className="admin-input" type="number" value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" />
          </Field>
        </div>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '0.75rem' }}>
          <Field label="Registo">
            <select className="admin-select" value={form.registro_tipo}
              onChange={(e) => setForm({ ...form, registro_tipo: e.target.value })}>
              <option value="realtime">Tempo real</option>
              <option value="postmatch">Pós-jogo</option>
            </select>
          </Field>
          <div className="admin-field">
            <label className="admin-label">Opções</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.requer_jogador}
                onChange={(e) => setForm({ ...form, requer_jogador: e.target.checked })} />
              <span style={{ fontSize: '0.85rem', color: '#374151' }}>Requer jogador</span>
            </label>
          </div>
        </div>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? 'Guardar' : 'Adicionar'} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Tipos de Evento</h2>
          {selectedModalityId && <button className="btn btn-sm btn-primary" onClick={openNew}>+ Novo</button>}
        </div>

        <div className="admin-filter-bar">
          <div className="admin-field-fixed">
            <label className="admin-label">Modalidade</label>
            <select className="admin-select" value={selectedModalityId} onChange={(e) => handleModalityChange(e.target.value)}>
              <option value="">Selecionar…</option>
              {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {!selectedModalityId
          ? <div className="admin-prompt"><span style={{ fontSize: '2rem' }}>☝️</span><p>Seleciona uma modalidade para ver os seus eventos.</p></div>
          : eventTypes.length === 0
            ? <div className="admin-empty">Ainda não há eventos para esta modalidade.</div>
            : (
              <div className="table-scroll">
                <table className="admin-table">
                  <thead><tr>
                    <th style={{ width: 36 }} className="col-center">Cor</th>
                    <th>Nome</th>
                    <th style={{ width: 110 }}>Registo</th>
                    <th className="col-center" style={{ width: 80 }}>Jogador</th>
                    <th className="col-right" style={{ width: 60 }}>Ordem</th>
                    <th className="col-right">Ações</th>
                  </tr></thead>
                  <tbody>
                    {eventTypes.map((et) => (
                      <tr key={et.id}>
                        <td className="col-center"><span className="color-dot" style={{ background: et.color }} /></td>
                        <td className="cell-primary">{et.name}</td>
                        <td>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: et.registro_tipo === 'realtime' ? '#eff6ff' : '#f0fdf4',
                            color: et.registro_tipo === 'realtime' ? '#1d4ed8' : '#166534',
                          }}>
                            {et.registro_tipo === 'realtime' ? 'Tempo real' : 'Pós-jogo'}
                          </span>
                        </td>
                        <td className="col-center" style={{ color: et.requer_jogador ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>
                          {et.requer_jogador ? '✓' : '—'}
                        </td>
                        <td className="col-right cell-muted">{et.sort_order}</td>
                        <td className="col-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(et)}>Editar</button>
                          <button className="btn btn-sm btn-danger" onClick={() => remove(et.id)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </>
  )
}

// ── Utilizadores ──────────────────────────────────────────────────────────────

const ROLE_LABELS = { super_admin: 'Super Admin', admin_club: 'Admin Club', club_opp: 'Club Opp' }
const ROLE_STYLE  = {
  super_admin: { background: '#fef3c7', color: '#92400e' },
  admin_club:  { background: '#eff6ff', color: '#1d4ed8' },
  club_opp:    { background: '#f0fdf4', color: '#166534' },
}
const EMPTY_USER = { name: '', email: '', password: '', role: 'admin_club', club_id: '' }

function UsersManager() {
  const [users, setUsers] = useState([])
  const [clubs, setClubs] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_USER)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    load()
    supabase.from('clubs').select('*').order('name').then(({ data }) => setClubs(data || []))
  }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*, clubs(name)').order('email')
    setUsers(data || [])
  }

  function openNew() {
    setEditing(null); setForm(EMPTY_USER); setErrors({}); setApiError(''); setOpen(true)
  }
  function openEdit(u) {
    setEditing(u)
    setForm({ name: u.name || '', email: u.email || '', password: '', role: u.role, club_id: u.club_id || '' })
    setErrors({}); setApiError(''); setOpen(true)
  }
  function close() { setOpen(false) }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Campo obrigatório'
    if (!form.email.trim()) e.email = 'Campo obrigatório'
    if (!editing) {
      if (!form.password.trim()) e.password = 'Campo obrigatório'
      else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    } else if (form.password && form.password.length < 6) {
      e.password = 'Mínimo 6 caracteres'
    }
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    setSaving(true); setApiError('')
    if (editing) {
      const body = { userId: editing.id, name: form.name, email: form.email, role: form.role, club_id: form.club_id }
      if (form.password) body.password = form.password
      const { error: fnError } = await supabase.functions.invoke('update-user', { body })
      if (fnError) { setApiError(fnError.message); setSaving(false); return }
    } else {
      const { error: fnError } = await supabase.functions.invoke('create-user', {
        body: { name: form.name, email: form.email, password: form.password, role: form.role, club_id: form.role !== 'super_admin' ? (form.club_id || null) : null },
      })
      if (fnError) { setApiError(fnError.message); setSaving(false); return }
    }
    close(); load(); setSaving(false)
  }

  async function remove(userId) {
    if (!confirm('Eliminar utilizador? Esta ação é irreversível.')) return
    await supabase.functions.invoke('delete-user', { body: { userId } }); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? 'Editar utilizador' : 'Novo utilizador'} width={560}>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Nome" required error={errors.name}>
            <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <input className={`admin-input${errors.email ? ' input-error' : ''}`} type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="utilizador@exemplo.com" />
          </Field>
          <Field label={editing ? 'Nova password' : 'Password'} required={!editing} error={errors.password}>
            <input className={`admin-input${errors.password ? ' input-error' : ''}`} type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? 'Deixar vazio para não alterar' : 'Mínimo 6 caracteres'} />
          </Field>
          <Field label="Tipo" required>
            <select className="admin-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, club_id: '' })}>
              <option value="admin_club">Admin Club</option>
              <option value="club_opp">Club Opp</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </Field>
          {form.role !== 'super_admin' && (
            <Field label="Clube">
              <select className="admin-select" value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })}>
                <option value="">Selecionar…</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        {apiError && <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>{apiError}</p>}
        <ModalFooter onCancel={close} onSave={save} saving={saving} saveLabel={editing ? 'Guardar' : 'Criar utilizador'} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Utilizadores</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>+ Novo</button>
        </div>
        {users.length === 0 ? <div className="admin-empty">Ainda não há utilizadores registados.</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th>Nome</th><th>Email</th><th>Papel</th><th>Clube</th>
                <th className="col-right">Ações</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-primary">{u.name || '—'}</td>
                    <td className="cell-muted">{u.email}</td>
                    <td><span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, ...ROLE_STYLE[u.role] }}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                    <td className="cell-muted">{u.clubs?.name || '—'}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(u.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
