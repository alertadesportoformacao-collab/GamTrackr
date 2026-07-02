import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import GameTrackView from './GameTrackView'
import { EscaloesManager, PlayersManager, GamesManager, OperadoresManager } from './ClubManagers'
import { useLanguage } from '../LanguageContext'
import '../admin.css'

const CLUB_TABS = new Set(['escaloes', 'jogadores', 'jogos', 'operadores'])

export default function SuperAdminView({ onLogout }) {
  const { t } = useLanguage()
  const [tab, setTab]                   = useState('clubs')
  const [clubs, setClubs]               = useState([])
  const [managedClubId, setManagedClubId] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)
  const [isOnline, setIsOnline]         = useState(navigator.onLine)

  const GLOBAL_NAV = [
    { key: 'clubs',      icon: '🏢', label: t('page.clubs') },
    { key: 'modalities', icon: '⚽', label: t('page.modalities') },
    { key: 'eventTypes', icon: '🎯', label: t('page.event_types') },
    { key: 'users',      icon: '👤', label: t('page.users') },
  ]

  const CLUB_NAV = [
    { key: 'escaloes',   icon: '🏅', label: t('page.escaloes') },
    { key: 'jogadores',  icon: '👤', label: t('page.players') },
    { key: 'jogos',      icon: '📅', label: t('page.games') },
    { key: 'operadores', icon: '🎮', label: t('page.operators') },
  ]

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
          <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>● {isOnline ? t('status.online') : t('status.offline')}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>{t('action.logout')}</button>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-sidebar">
          <div className="admin-nav-section">{t('nav.section_global')}</div>
          {GLOBAL_NAV.map(({ key, icon, label }) => (
            <button key={key} className={`admin-nav-item${tab === key ? ' active' : ''}`} onClick={() => switchTab(key)}>
              <span className="admin-nav-icon">{icon}</span>{label}
            </button>
          ))}

          <div className="admin-nav-section" style={{ marginTop: '0.75rem' }}>{t('nav.section_club')}</div>

          <div style={{ padding: '0 0.75rem 0.5rem' }}>
            <select
              className="admin-select"
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', width: '100%' }}
              value={managedClubId}
              onChange={(e) => setManagedClubId(e.target.value)}
            >
              <option value="">{t('action.select_club')}</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {CLUB_NAV.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`admin-nav-item${tab === key ? ' active' : ''}`}
              onClick={() => switchTab(key)}
              disabled={!managedClubId}
              style={{ opacity: managedClubId ? 1 : 0.4 }}
            >
              <span className="admin-nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>

        <main className="admin-main">
          {tab === 'clubs'      && <ClubsManager onClubsChange={setClubs} />}
          {tab === 'modalities' && <ModalitiesManager />}
          {tab === 'eventTypes' && <EventTypesManager />}
          {tab === 'users'      && <UsersManager />}

          {CLUB_TABS.has(tab) && !managedClubId && (
            <div className="admin-prompt">
              <span style={{ fontSize: '2rem' }}>🏢</span>
              <p>{t('error.select_club')}</p>
            </div>
          )}
          {CLUB_TABS.has(tab) && managedClubId && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1.25rem', padding: '0.6rem 1rem',
                background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe',
              }}>
                <span style={{ fontSize: '1rem' }}>🏢</span>
                <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>{managedClub?.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: 'auto' }}>
                  {t('admin.managing_as')}
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

function Field({ label, required, error, children }) {
  return (
    <div className="admin-field">
      <label className="admin-label">{required ? <>{label} <span className="required-mark">*</span></> : label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel }) {
  const { t } = useLanguage()
  return (
    <div className="admin-form-footer" style={{ marginTop: '1.25rem' }}>
      <button className="btn btn-secondary" onClick={onCancel}>{t('action.cancel')}</button>
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? t('action.saving') : (saveLabel ?? t('action.save'))}
      </button>
    </div>
  )
}

// ── Clubes ────────────────────────────────────────────────────────────────────

export function ClubsManager({ onClubsChange }) {
  const { t } = useLanguage()
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
    const e = {}; if (!name.trim()) e.name = t('error.required')
    setErrors(e); if (Object.keys(e).length) return
    editing
      ? await supabase.from('clubs').update({ name }).eq('id', editing.id)
      : await supabase.from('clubs').insert({ name })
    close(); load()
  }

  async function remove(id) {
    if (!confirm(t('confirm.delete_club'))) return
    await supabase.from('clubs').delete().eq('id', id); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? t('modal.edit_club') : t('modal.new_club')} width={420}>
        <Field label={t('field.name')} required error={errors.name}>
          <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Sporting CP" />
        </Field>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? t('action.save') : t('action.add')} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('page.clubs')}</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>{t('action.new')}</button>
        </div>
        {clubs.length === 0 ? <div className="admin-empty">{t('empty.clubs')}</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th>{t('field.name')}</th>
                <th className="col-right">{t('label.actions')}</th>
              </tr></thead>
              <tbody>
                {clubs.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-primary">{c.name}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}>{t('action.edit')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>{t('action.delete')}</button>
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

export function ModalitiesManager() {
  const { t } = useLanguage()
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
    const e = {}; if (!name.trim()) e.name = t('error.required')
    setErrors(e); if (Object.keys(e).length) return
    editing
      ? await supabase.from('modalities').update({ name }).eq('id', editing.id)
      : await supabase.from('modalities').insert({ name })
    close(); load()
  }

  async function remove(id) {
    if (!confirm(t('confirm.delete_modality'))) return
    await supabase.from('modalities').delete().eq('id', id); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? t('modal.edit_modality') : t('modal.new_modality')} width={420}>
        <Field label={t('field.name')} required error={errors.name}>
          <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Futsal" />
        </Field>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? t('action.save') : t('action.add')} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('page.modalities')}</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>{t('action.new_f')}</button>
        </div>
        {modalities.length === 0 ? <div className="admin-empty">{t('empty.modalities')}</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th>{t('field.name')}</th>
                <th className="col-right">{t('label.actions')}</th>
              </tr></thead>
              <tbody>
                {modalities.map((m) => (
                  <tr key={m.id}>
                    <td className="cell-primary">{m.name}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(m)}>{t('action.edit')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(m.id)}>{t('action.delete')}</button>
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

// ── Ações de Jogo ─────────────────────────────────────────────────────────────

const MODO_COLORS = {
  live:     { bg: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: 'rgba(14,165,233,0.3)' },
  pos_jogo: { bg: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: 'rgba(167,139,250,0.3)' },
  ambos:    { bg: 'rgba(52,211,153,0.15)', color: '#6ee7b7', border: 'rgba(52,211,153,0.3)' },
}

const EMPTY_ET = { name: '', color: '#3b82f6', sort_order: '', modo: 'live', tipo: 'imediato', requer_jogador: true, ativo: true }

export function EventTypesManager() {
  const { t } = useLanguage()
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
      modo: et.modo || (et.registro_tipo === 'postmatch' ? 'pos_jogo' : 'live'),
      tipo: et.tipo || 'imediato',
      requer_jogador: et.requer_jogador !== false,
      ativo: et.ativo !== false,
    })
    setErrors({})
    setOpen(true)
  }
  function close() { setOpen(false) }

  async function toggleAtivo(et) {
    await supabase.from('event_types').update({ ativo: !et.ativo }).eq('id', et.id)
    load(selectedModalityId)
  }

  async function save() {
    const e = {}; if (!form.name.trim()) e.name = t('error.required')
    setErrors(e); if (Object.keys(e).length) return
    const payload = {
      name: form.name, color: form.color,
      sort_order: parseInt(form.sort_order) || 0,
      modality_id: selectedModalityId,
      modo: form.modo,
      tipo: form.tipo,
      requer_jogador: form.requer_jogador,
      ativo: form.ativo,
      registro_tipo: form.modo === 'pos_jogo' ? 'postmatch' : 'realtime',
    }
    editing
      ? await supabase.from('event_types').update(payload).eq('id', editing.id)
      : await supabase.from('event_types').insert(payload)
    close(); load(selectedModalityId)
  }

  async function remove(id) {
    if (!confirm(t('confirm.delete_event_type'))) return
    await supabase.from('event_types').delete().eq('id', id); load(selectedModalityId)
  }

  const badgeStyle = (colors) => ({
    fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
    background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
  })

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? t('modal.edit_event_type') : t('modal.new_event_type')} width={520}>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 72px 90px' }}>
          <Field label={t('field.name')} required error={errors.name}>
            <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Golo" />
          </Field>
          <div className="admin-color-field">
            <label className="admin-label">{t('field.color')}</label>
            <input type="color" className="admin-color-input" value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: '100%' }} />
          </div>
          <Field label={t('field.order')}>
            <input className="admin-input" type="number" value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" />
          </Field>
        </div>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '0.75rem' }}>
          <Field label={t('field.type')}>
            <select className="admin-select" value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="imediato">{t('event_tipo.imediato')}</option>
              <option value="periodo">{t('event_tipo.periodo')}</option>
              <option value="outro">{t('event_tipo.outro')}</option>
            </select>
          </Field>
          <Field label={t('field.mode')}>
            <select className="admin-select" value={form.modo}
              onChange={(e) => setForm({ ...form, modo: e.target.value })}>
              <option value="live">{t('event_modo.live')}</option>
              <option value="pos_jogo">{t('event_modo.pos_jogo')}</option>
              <option value="ambos">{t('event_modo.ambos')}</option>
            </select>
          </Field>
        </div>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '0.75rem' }}>
          <div className="admin-field">
            <label className="admin-label">{t('field.requires_player')}</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.requer_jogador}
                onChange={(e) => setForm({ ...form, requer_jogador: e.target.checked })} />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{t('badge.yes')}</span>
            </label>
          </div>
          <div className="admin-field">
            <label className="admin-label">{t('field.enabled')}</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.3rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{t('badge.active')}</span>
            </label>
          </div>
        </div>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? t('action.save') : t('action.add')} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('page.event_types')}</h2>
          {selectedModalityId && <button className="btn btn-sm btn-primary" onClick={openNew}>{t('action.new')}</button>}
        </div>

        <div className="admin-filter-bar">
          <div className="admin-field-fixed">
            <label className="admin-label">{t('field.modality')}</label>
            <select className="admin-select" value={selectedModalityId} onChange={(e) => handleModalityChange(e.target.value)}>
              <option value="">{t('select.choose')}</option>
              {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {!selectedModalityId
          ? <div className="admin-prompt"><span style={{ fontSize: '2rem' }}>☝️</span><p>{t('admin.select_modality')}</p></div>
          : eventTypes.length === 0
            ? <div className="admin-empty">{t('empty.event_types')}</div>
            : (
              <div className="table-scroll">
                <table className="admin-table">
                  <thead><tr>
                    <th style={{ width: 36 }} className="col-center">Cor</th>
                    <th>{t('field.name')}</th>
                    <th style={{ width: 100, whiteSpace: 'nowrap' }}>{t('field.type')}</th>
                    <th style={{ width: 100, whiteSpace: 'nowrap' }}>{t('field.mode')}</th>
                    <th className="col-center" style={{ width: 70 }}>{t('col.player_req')}</th>
                    <th className="col-center" style={{ width: 70 }}>{t('field.enabled')}</th>
                    <th className="col-right" style={{ width: 60 }}>{t('field.order')}</th>
                    <th className="col-right">{t('label.actions')}</th>
                  </tr></thead>
                  <tbody>
                    {eventTypes.map((et) => {
                      const etModo  = et.modo || (et.registro_tipo === 'postmatch' ? 'pos_jogo' : 'live')
                      const etTipo  = et.tipo || 'imediato'
                      const etAtivo = et.ativo !== false
                      return (
                        <tr key={et.id} style={{ opacity: etAtivo ? 1 : 0.5 }}>
                          <td className="col-center"><span className="color-dot" style={{ background: et.color }} /></td>
                          <td className="cell-primary">{et.name}</td>
                          <td>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                              {t(`event_tipo.${etTipo}`)}
                            </span>
                          </td>
                          <td>
                            <span style={badgeStyle(MODO_COLORS[etModo] || MODO_COLORS.live)}>
                              {t(`event_modo.${etModo}`)}
                            </span>
                          </td>
                          <td className="col-center" style={{ color: et.requer_jogador ? '#4ade80' : '#64748b', fontWeight: 700 }}>
                            {et.requer_jogador ? '✓' : '—'}
                          </td>
                          <td className="col-center">
                            <button onClick={() => toggleAtivo(et)} style={{
                              fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, cursor: 'pointer', border: 'none',
                              background: etAtivo ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                              color: etAtivo ? '#4ade80' : '#f87171',
                            }}>
                              {etAtivo ? t('badge.active') : t('badge.inactive')}
                            </button>
                          </td>
                          <td className="col-right cell-muted">{et.sort_order}</td>
                          <td className="col-actions">
                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(et)}>{t('action.edit')}</button>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(et.id)}>{t('action.delete')}</button>
                          </td>
                        </tr>
                      )
                    })}
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

const ROLE_STYLE = {
  super_admin: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  admin_club:  { background: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
  club_opp:    { background: 'rgba(52,211,153,0.12)', color: '#34d399' },
}
const EMPTY_USER = { name: '', email: '', password: '', role: 'admin_club', club_id: '', username: '' }

export function UsersManager() {
  const { t } = useLanguage()
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
    setForm({ name: u.name || '', email: u.email || '', password: '', role: u.role, club_id: u.club_id || '', username: u.username || u.name || '' })
    setErrors({}); setApiError(''); setOpen(true)
  }
  function close() { setOpen(false) }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = t('error.required')
    if (!form.email.trim()) e.email = t('error.required')
    if (!editing) {
      if (!form.password.trim()) e.password = t('error.required')
      else if (form.password.length < 6) e.password = t('error.min_6_chars')
    } else if (form.password && form.password.length < 6) {
      e.password = t('error.min_6_chars')
    }
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    setSaving(true); setApiError('')
    if (editing) {
      const body = { userId: editing.id, name: form.name, email: form.email, role: form.role, club_id: form.club_id, username: form.username || null }
      if (form.password) body.password = form.password
      const { error: fnError } = await supabase.functions.invoke('update-user', { body })
      if (fnError) { setApiError(fnError.message || JSON.stringify(fnError)); setSaving(false); return }
    } else {
      const { error: fnError } = await supabase.functions.invoke('create-user', {
        body: { name: form.name, email: form.email, password: form.password, role: form.role, club_id: form.role !== 'super_admin' ? (form.club_id || null) : null, username: form.username || null },
      })
      if (fnError) { setApiError(fnError.message || JSON.stringify(fnError)); setSaving(false); return }
    }
    close(); load(); setSaving(false)
  }

  async function remove(userId) {
    if (!confirm(t('confirm.delete_user'))) return
    await supabase.functions.invoke('delete-user', { body: { userId } }); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? t('modal.edit_user') : t('modal.new_user')} width={560}>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label={t('field.name')} required error={errors.name}>
            <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          </Field>
          <Field label={t('field.username')}>
            <input className="admin-input" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
              placeholder="ex: tiagob" />
          </Field>
          <Field label={t('field.email')} required error={errors.email}>
            <input className={`admin-input${errors.email ? ' input-error' : ''}`} type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="utilizador@exemplo.com" />
          </Field>
          <Field label={editing ? t('field.new_password') : t('login.password')} required={!editing} error={errors.password}>
            <input className={`admin-input${errors.password ? ' input-error' : ''}`} type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? t('field.leave_blank') : t('error.min_6_chars')} />
          </Field>
          <Field label={t('field.role')} required>
            <select className="admin-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, club_id: '' })}>
              <option value="admin_club">{t('role.admin_club')}</option>
              <option value="club_opp">{t('role.club_opp')}</option>
              <option value="super_admin">{t('role.super_admin')}</option>
            </select>
          </Field>
          {form.role !== 'super_admin' && (
            <Field label={t('field.club')}>
              <select className="admin-select" value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })}>
                <option value="">{t('select.choose')}</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        {apiError && <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#f87171', background: 'rgba(239,68,68,0.08)', padding: '0.5rem 0.75rem', borderRadius: 6 }}>{apiError}</p>}
        <ModalFooter onCancel={close} onSave={save} saving={saving} saveLabel={editing ? t('action.save') : t('action.create_user')} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('page.users')}</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>{t('action.new')}</button>
        </div>
        {users.length === 0 ? <div className="admin-empty">{t('empty.users')}</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th>{t('field.name')}</th>
                <th>{t('col.username')}</th>
                <th>{t('field.email')}</th>
                <th>{t('col.role')}</th>
                <th>{t('field.club')}</th>
                <th className="col-right">{t('label.actions')}</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-primary">{u.name || '—'}</td>
                    <td className="cell-muted">{u.username || '—'}</td>
                    <td className="cell-muted">{u.email}</td>
                    <td>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, ...ROLE_STYLE[u.role] }}>
                        {t(`role.${u.role}`)}
                      </span>
                    </td>
                    <td className="cell-muted">{u.clubs?.name || '—'}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>{t('action.edit')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(u.id)}>{t('action.delete')}</button>
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
