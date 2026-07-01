import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import '../admin.css'

const NAV = [
  { key: 'clubs',       icon: '🏢', label: 'Clubes' },
  { key: 'modalities',  icon: '⚽', label: 'Modalidades' },
  { key: 'eventTypes',  icon: '🎯', label: 'Tipos de Evento' },
  { key: 'users',       icon: '👤', label: 'Utilizadores' },
]

export default function SuperAdminView({ onLogout }) {
  const [tab, setTab] = useState('clubs')
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo">GamTrackr</span>
          <span className="admin-role-badge">Super Admin</span>
        </div>
        <div className="admin-header-right">
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sair</button>
        </div>
      </header>
      <div className="admin-body">
        <nav className="admin-sidebar">
          <div className="admin-nav-section">Gestão Global</div>
          {NAV.map(({ key, icon, label }) => (
            <button key={key} className={`admin-nav-item${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              <span className="admin-nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <main className="admin-main">
          {tab === 'clubs'      && <ClubsManager />}
          {tab === 'modalities' && <ModalitiesManager />}
          {tab === 'eventTypes' && <EventTypesManager />}
          {tab === 'users'      && <UsersManager />}
        </main>
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── Clubes ────────────────────────────────────────────────────────────────────

function ClubsManager() {
  const [clubs, setClubs] = useState([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('clubs').select('*').order('name')
    setClubs(data || [])
  }

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Campo obrigatório'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    if (editing) {
      await supabase.from('clubs').update({ name }).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('clubs').insert({ name })
    }
    setName(''); setErrors({})
    load()
  }

  function startEdit(c) { setEditing(c); setName(c.name); setErrors({}) }
  function cancel() { setEditing(null); setName(''); setErrors({}) }

  async function remove(id) {
    if (!confirm('Eliminar clube?')) return
    await supabase.from('clubs').delete().eq('id', id)
    load()
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Clubes</h2>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{clubs.length} registo{clubs.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={`admin-form-section${editing ? ' is-editing' : ''}`}>
        <span className="admin-form-label">{editing ? 'Editar clube' : 'Novo clube'}</span>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <Field label="Nome" required error={errors.name}>
            <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Sporting CP" />
          </Field>
        </div>
        <div className="admin-form-footer">
          {editing && <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
          <button className="btn btn-primary" onClick={save}>{editing ? 'Guardar alterações' : 'Adicionar clube'}</button>
        </div>
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
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(c)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Eliminar</button>
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

// ── Modalidades ───────────────────────────────────────────────────────────────

function ModalitiesManager() {
  const [modalities, setModalities] = useState([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('modalities').select('*').order('name')
    setModalities(data || [])
  }

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Campo obrigatório'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    if (editing) {
      await supabase.from('modalities').update({ name }).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('modalities').insert({ name })
    }
    setName(''); setErrors({}); load()
  }

  function startEdit(m) { setEditing(m); setName(m.name); setErrors({}) }
  function cancel() { setEditing(null); setName(''); setErrors({}) }

  async function remove(id) {
    if (!confirm('Eliminar modalidade?')) return
    await supabase.from('modalities').delete().eq('id', id)
    load()
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Modalidades</h2>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{modalities.length} registo{modalities.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={`admin-form-section${editing ? ' is-editing' : ''}`}>
        <span className="admin-form-label">{editing ? 'Editar modalidade' : 'Nova modalidade'}</span>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <Field label="Nome" required error={errors.name}>
            <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Futsal" />
          </Field>
        </div>
        <div className="admin-form-footer">
          {editing && <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
          <button className="btn btn-primary" onClick={save}>{editing ? 'Guardar alterações' : 'Adicionar modalidade'}</button>
        </div>
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
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(m)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(m.id)}>Eliminar</button>
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

// ── Tipos de Evento ───────────────────────────────────────────────────────────

const EMPTY_ET = { name: '', color: '#3b82f6', sort_order: '' }

function EventTypesManager() {
  const [eventTypes, setEventTypes] = useState([])
  const [modalities, setModalities] = useState([])
  const [selectedModalityId, setSelectedModalityId] = useState('')
  const [form, setForm] = useState(EMPTY_ET)
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    supabase.from('modalities').select('*').order('name').then(({ data }) => setModalities(data || []))
  }, [])

  async function load(id) {
    if (!id) { setEventTypes([]); return }
    const { data } = await supabase.from('event_types').select('*').eq('modality_id', id).order('sort_order')
    setEventTypes(data || [])
  }

  function handleModalityChange(id) {
    setSelectedModalityId(id); setEditing(null); setForm(EMPTY_ET); setErrors({}); load(id)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    const payload = { name: form.name, color: form.color, sort_order: parseInt(form.sort_order) || 0, modality_id: selectedModalityId }
    if (editing) {
      await supabase.from('event_types').update(payload).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('event_types').insert(payload)
    }
    setForm(EMPTY_ET); setErrors({}); load(selectedModalityId)
  }

  function startEdit(et) { setEditing(et); setForm({ name: et.name, color: et.color, sort_order: String(et.sort_order ?? '') }); setErrors({}) }
  function cancel() { setEditing(null); setForm(EMPTY_ET); setErrors({}) }

  async function remove(id) {
    if (!confirm('Eliminar tipo de evento?')) return
    await supabase.from('event_types').delete().eq('id', id)
    load(selectedModalityId)
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Tipos de Evento</h2>
        {selectedModalityId && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{eventTypes.length} evento{eventTypes.length !== 1 ? 's' : ''}</span>}
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

      {!selectedModalityId ? (
        <div className="admin-prompt"><span style={{ fontSize: '2rem' }}>☝️</span><p>Seleciona uma modalidade para ver e gerir os seus eventos.</p></div>
      ) : (
        <>
          <div className={`admin-form-section${editing ? ' is-editing' : ''}`}>
            <span className="admin-form-label">{editing ? 'Editar evento' : 'Novo evento'}</span>
            <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 80px 90px' }}>
              <Field label="Nome" required error={errors.name}>
                <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex: Golo" />
              </Field>
              <div className="admin-color-field">
                <label className="admin-label">Cor</label>
                <input type="color" className="admin-color-input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: '100%' }} />
              </div>
              <Field label="Ordem">
                <input className="admin-input" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" />
              </Field>
            </div>
            <div className="admin-form-footer">
              {editing && <button className="btn btn-secondary" onClick={cancel}>Cancelar</button>}
              <button className="btn btn-primary" onClick={save}>{editing ? 'Guardar alterações' : 'Adicionar evento'}</button>
            </div>
          </div>

          {eventTypes.length === 0 ? <div className="admin-empty">Ainda não há eventos para esta modalidade.</div> : (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }} className="col-center">Cor</th>
                    <th>Nome</th>
                    <th className="col-right" style={{ width: 80 }}>Ordem</th>
                    <th className="col-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {eventTypes.map((et) => (
                    <tr key={et.id}>
                      <td className="col-center"><span className="color-dot" style={{ background: et.color }} /></td>
                      <td className="cell-primary">{et.name}</td>
                      <td className="col-right cell-muted">{et.sort_order}</td>
                      <td className="col-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => startEdit(et)}>Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(et.id)}>Eliminar</button>
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

// ── Utilizadores ──────────────────────────────────────────────────────────────

const EMPTY_USER = { name: '', email: '', password: '', role: 'club_admin', club_id: '' }
const ROLE_LABELS = { super_admin: 'Super Admin', club_admin: 'Club Admin' }
const ROLE_STYLE  = { super_admin: { background: '#fef3c7', color: '#92400e' }, club_admin: { background: '#eff6ff', color: '#1d4ed8' } }

function UsersManager() {
  const [users, setUsers] = useState([])
  const [clubs, setClubs] = useState([])
  const [form, setForm] = useState(EMPTY_USER)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    load()
    supabase.from('clubs').select('*').order('name').then(({ data }) => setClubs(data || []))
  }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*, clubs(name)').order('email')
    setUsers(data || [])
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    if (!form.email.trim()) e.email = 'Campo obrigatório'
    if (!form.password.trim()) e.password = 'Campo obrigatório'
    else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    setLoading(true); setApiError('')
    const { error: fnError } = await supabase.functions.invoke('create-user', {
      body: { name: form.name, email: form.email, password: form.password, role: form.role, club_id: form.role === 'club_admin' ? (form.club_id || null) : null },
    })
    if (fnError) setApiError(fnError.message)
    else { setForm(EMPTY_USER); setErrors({}); load() }
    setLoading(false)
  }

  async function remove(userId) {
    if (!confirm('Eliminar utilizador? Esta ação é irreversível.')) return
    const { error: fnError } = await supabase.functions.invoke('delete-user', { body: { userId } })
    if (!fnError) load()
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Utilizadores</h2>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{users.length} utilizador{users.length !== 1 ? 'es' : ''}</span>
      </div>

      <div className="admin-form-section">
        <span className="admin-form-label">Novo utilizador</span>
        <div className="admin-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <Field label="Nome" required error={errors.name}>
            <input className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <input className={`admin-input${errors.email ? ' input-error' : ''}`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="utilizador@exemplo.com" />
          </Field>
          <Field label="Password" required error={errors.password}>
            <input className={`admin-input${errors.password ? ' input-error' : ''}`} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
          </Field>
          <Field label="Tipo de utilizador" required>
            <select className="admin-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, club_id: '' })}>
              <option value="club_admin">Club Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </Field>
          {form.role === 'club_admin' && (
            <Field label="Clube">
              <select className="admin-select" value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })}>
                <option value="">Selecionar…</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        {apiError && <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>{apiError}</p>}
        <div className="admin-form-footer">
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'A criar…' : 'Criar utilizador'}</button>
        </div>
      </div>

      {users.length === 0 ? <div className="admin-empty">Ainda não há utilizadores registados.</div> : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Clube</th>
                <th className="col-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-primary">{u.name || '—'}</td>
                  <td className="cell-muted">{u.email}</td>
                  <td><span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20, ...ROLE_STYLE[u.role] }}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td className="cell-muted">{u.clubs?.name || '—'}</td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-danger" onClick={() => remove(u.id)}>Eliminar</button>
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
