import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import { uploadChunked } from '../utils/uploadChunked'

// ── Shared helpers ────────────────────────────────────────────────────────────

export function Field({ label, required, error, children }) {
  return (
    <div className="admin-field">
      <label className="admin-label">{required ? <>{label} <span className="required-mark">*</span></> : label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

export function ModalFooter({ onCancel, onSave, saving, saveLabel = 'Guardar' }) {
  return (
    <div className="admin-form-footer" style={{ marginTop: '1.25rem' }}>
      <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? 'A guardar…' : saveLabel}
      </button>
    </div>
  )
}

// ── Escalões ──────────────────────────────────────────────────────────────────

export function EscaloesManager({ clubId }) {
  const [escaloes, setEscaloes] = useState([])
  const [modalities, setModalities] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', modality_id: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    load()
    supabase.from('modalities').select('*').order('name').then(({ data }) => setModalities(data || []))
  }, [clubId])

  async function load() {
    const { data } = await supabase.from('escaloes').select('*, modalities(name)').eq('club_id', clubId).order('name')
    setEscaloes(data || [])
  }

  function openNew()  { setEditing(null); setForm({ name: '', modality_id: '' }); setErrors({}); setOpen(true) }
  function openEdit(e){ setEditing(e); setForm({ name: e.name, modality_id: e.modality_id }); setErrors({}); setOpen(true) }
  function close()    { setOpen(false) }

  async function save() {
    const e = {}
    if (!form.name.trim())  e.name        = 'Campo obrigatório'
    if (!form.modality_id)  e.modality_id = 'Campo obrigatório'
    setErrors(e); if (Object.keys(e).length) return
    const payload = { name: form.name, modality_id: form.modality_id, club_id: clubId }
    editing
      ? await supabase.from('escaloes').update(payload).eq('id', editing.id)
      : await supabase.from('escaloes').insert(payload)
    close(); load()
  }

  async function remove(id) {
    if (!confirm('Eliminar escalão? Todos os jogadores e jogos associados serão eliminados.')) return
    await supabase.from('escaloes').delete().eq('id', id); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? 'Editar escalão' : 'Novo escalão'} width={460}>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Nome" required error={errors.name}>
            <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Sub-17" />
          </Field>
          <Field label="Modalidade" required error={errors.modality_id}>
            <select className={`admin-select${errors.modality_id ? ' input-error' : ''}`} value={form.modality_id}
              onChange={(e) => setForm({ ...form, modality_id: e.target.value })}>
              <option value="">Selecionar…</option>
              {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
        </div>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? 'Guardar' : 'Adicionar'} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Escalões</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>+ Novo</button>
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
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(e)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(e.id)}>Eliminar</button>
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

// ── Jogadores ─────────────────────────────────────────────────────────────────

const EMPTY_PLAYER = { name: '', number: '', birth_date: '', escalao_superior: false, fpf_link: '', photo_url: '' }

export function PlayersManager({ clubId }) {
  const [allPlayers, setAllPlayers] = useState([])
  const [escaloes, setEscaloes] = useState([])
  const [selectedEscalaoId, setSelectedEscalaoId] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_PLAYER)
  const [errors, setErrors] = useState({})
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoProgress, setPhotoProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('escaloes').select('*').eq('club_id', clubId).order('name')
      .then(({ data }) => setEscaloes(data || []))
    loadAll()
  }, [clubId])

  async function loadAll() {
    const { data: escData } = await supabase.from('escaloes').select('id').eq('club_id', clubId)
    const ids = (escData || []).map((e) => e.id)
    if (!ids.length) { setAllPlayers([]); return }
    const { data } = await supabase.from('players').select('*, escaloes(name)').in('escalao_id', ids).order('number')
    setAllPlayers(data || [])
  }

  const players = selectedEscalaoId ? allPlayers.filter((p) => p.escalao_id === selectedEscalaoId) : allPlayers

  function openNew() {
    setEditing(null); setForm(EMPTY_PLAYER)
    setPhotoFile(null); setPhotoPreview(null); setPhotoProgress(0)
    setErrors({}); setSaveError(''); setOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({ name: p.name, number: String(p.number), birth_date: p.birth_date || '', escalao_superior: p.escalao_superior || false, fpf_link: p.fpf_link || '', photo_url: p.photo_url || '' })
    setPhotoFile(null); setPhotoPreview(p.photo_url || null); setPhotoProgress(0)
    setErrors({}); setSaveError(''); setOpen(true)
  }

  function close() {
    setOpen(false)
    if (photoFile) { URL.revokeObjectURL(photoPreview); setPhotoFile(null) }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoFile) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoProgress(0)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    if (form.fpf_link && !/^https?:\/\/.+/.test(form.fpf_link.trim())) e.fpf_link = 'URL inválido'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    setSaving(true); setSaveError(''); setPhotoProgress(0)
    try {
      let photo_url = form.photo_url || null
      if (photoFile) {
        const ext  = photoFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        photo_url  = await uploadChunked('player-photos', path, photoFile, setPhotoProgress)
      }
      const escalaoId = editing ? editing.escalao_id : selectedEscalaoId
      const payload = {
        name: form.name, number: parseInt(form.number) || 0,
        birth_date: form.birth_date || null, escalao_superior: form.escalao_superior,
        fpf_link: form.fpf_link.trim() || null, photo_url, escalao_id: escalaoId,
      }
      const { error } = editing
        ? await supabase.from('players').update(payload).eq('id', editing.id)
        : await supabase.from('players').insert(payload)
      if (error) { setSaveError(error.message); return }
      close(); loadAll()
    } catch (err) {
      setSaveError(err.message ?? 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!confirm('Eliminar jogador?')) return
    await supabase.from('players').delete().eq('id', id); loadAll()
  }

  function age(d) {
    if (!d) return null
    return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? `Editar — ${editing.name}` : 'Novo jogador'} width={600}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div onClick={() => fileRef.current?.click()} style={{
            width: 88, height: 88, borderRadius: 10, flexShrink: 0,
            background: '#f1f5f9', border: '2px dashed #cbd5e1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', cursor: 'pointer',
          }}>
            {photoPreview
              ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>📷</span>}
          </div>
          <div style={{ flex: 1 }}>
            <label className="admin-label">Foto do jogador</label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
            <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
                {photoPreview ? 'Alterar foto' : 'Escolher foto'}
              </button>
              {photoPreview && (
                <button type="button" className="btn btn-sm btn-danger" onClick={() => { setPhotoFile(null); setPhotoPreview(null); setForm({ ...form, photo_url: '' }) }}>
                  Remover
                </button>
              )}
            </div>
            {photoProgress > 0 && photoProgress < 100 && (
              <div style={{ marginTop: '0.6rem', height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${photoProgress}%`, background: '#1d4ed8', borderRadius: 3, transition: 'width 0.2s' }} />
              </div>
            )}
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>JPEG, PNG ou WebP · máx. 5 MB</p>
          </div>
        </div>

        <div className="admin-form-grid" style={{ gridTemplateColumns: '72px 1fr 160px' }}>
          <Field label="Nº">
            <input className="admin-input" type="number" min="0" value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="10" />
          </Field>
          <Field label="Nome" required error={errors.name}>
            <input autoFocus={!editing} className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          </Field>
          <Field label="Data de nascimento">
            <input className="admin-input" type="date" value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Link biografia FPF" error={errors.fpf_link}>
              <input className={`admin-input${errors.fpf_link ? ' input-error' : ''}`} type="url" value={form.fpf_link}
                onChange={(e) => setForm({ ...form, fpf_link: e.target.value })} placeholder="https://www.fpf.pt/…" />
            </Field>
          </div>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer',
            fontSize: '0.875rem', userSelect: 'none',
            background: form.escalao_superior ? '#fef9c3' : '#f8fafc',
            border: `1.5px solid ${form.escalao_superior ? '#fde047' : '#e2e8f0'}`,
            borderRadius: 8, padding: '0.5rem 0.85rem', whiteSpace: 'nowrap', marginBottom: 1,
          }}>
            <input type="checkbox" checked={form.escalao_superior}
              onChange={(e) => setForm({ ...form, escalao_superior: e.target.checked })}
              style={{ width: 15, height: 15, accentColor: '#ca8a04', cursor: 'pointer' }} />
            <span style={{ fontWeight: form.escalao_superior ? 700 : 500, color: form.escalao_superior ? '#92400e' : '#374151' }}>
              Escalão superior
            </span>
          </label>
        </div>

        {saveError && (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
            {saveError}
          </p>
        )}
        <ModalFooter onCancel={close} onSave={save} saving={saving} saveLabel={editing ? 'Guardar' : 'Adicionar jogador'} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Jogadores</h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select className="admin-select" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
              value={selectedEscalaoId} onChange={(e) => setSelectedEscalaoId(e.target.value)}>
              <option value="">Todos os escalões</option>
              {escaloes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button className="btn btn-sm btn-primary" onClick={openNew} disabled={!selectedEscalaoId}
              title={!selectedEscalaoId ? 'Seleciona um escalão para adicionar' : ''}>
              + Novo
            </button>
          </div>
        </div>

        {allPlayers.length === 0 ? <div className="admin-empty">Ainda não há jogadores registados.</div>
          : players.length === 0 ? <div className="admin-empty">Nenhum jogador neste escalão.</div>
          : (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 42 }}></th>
                    <th style={{ width: 44 }} className="col-center">Nº</th>
                    <th>Nome</th>
                    <th>Escalão</th>
                    <th style={{ width: 110 }}>Nascimento</th>
                    <th className="col-center" style={{ width: 70 }}>Esc. Sup.</th>
                    <th style={{ width: 44 }} className="col-center">FPF</th>
                    <th className="col-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        {p.photo_url
                          ? <img src={p.photo_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#cbd5e1' }}>👤</div>}
                      </td>
                      <td className="col-center" style={{ fontWeight: 700, color: '#94a3b8' }}>#{p.number}</td>
                      <td className="cell-primary">{p.name}</td>
                      <td className="cell-muted">{p.escaloes?.name || '—'}</td>
                      <td className="cell-muted">
                        {p.birth_date ? <>{new Date(p.birth_date).toLocaleDateString('pt-PT')} <span style={{ color: '#cbd5e1' }}>({age(p.birth_date)}a)</span></> : '—'}
                      </td>
                      <td className="col-center">
                        {p.escalao_superior
                          ? <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20 }}>Sim</span>
                          : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td className="col-center">
                        {p.fpf_link
                          ? <a href={p.fpf_link} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>Bio</a>
                          : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td className="col-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Eliminar</button>
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

// ── Jogos ─────────────────────────────────────────────────────────────────────

const EMPTY_GAME = { escalao_id: '', opponent: '', game_date: '' }

export function GamesManager({ clubId, onSelectGame }) {
  const [games, setGames] = useState([])
  const [escaloes, setEscaloes] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_GAME)
  const [errors, setErrors] = useState({})

  useEffect(() => { init() }, [clubId])

  async function init() {
    const { data } = await supabase.from('escaloes').select('*').eq('club_id', clubId).order('name')
    setEscaloes(data || [])
    const ids = (data || []).map((e) => e.id)
    if (!ids.length) { setGames([]); return }
    const { data: gamesData } = await supabase.from('games').select('*, escaloes(id, name, modality_id)').in('escalao_id', ids).order('game_date', { ascending: false })
    setGames(gamesData || [])
  }

  function openNew()  { setEditing(null); setForm(EMPTY_GAME); setErrors({}); setOpen(true) }
  function openEdit(g){ setEditing(g); setForm({ escalao_id: g.escalao_id || '', opponent: g.opponent, game_date: (g.game_date || '').slice(0, 10) }); setErrors({}); setOpen(true) }
  function close()    { setOpen(false) }

  async function save() {
    const e = {}
    if (!form.escalao_id)      e.escalao_id = 'Campo obrigatório'
    if (!form.opponent.trim()) e.opponent   = 'Campo obrigatório'
    if (!form.game_date)       e.game_date  = 'Campo obrigatório'
    setErrors(e); if (Object.keys(e).length) return
    const payload = { escalao_id: form.escalao_id, opponent: form.opponent, game_date: form.game_date }
    editing
      ? await supabase.from('games').update(payload).eq('id', editing.id)
      : await supabase.from('games').insert(payload)
    close(); init()
  }

  async function remove(id) {
    if (!confirm('Eliminar jogo?')) return
    await supabase.from('games').delete().eq('id', id); init()
  }

  return (
    <>
      <Modal open={open} onClose={close} title={editing ? 'Editar jogo' : 'Novo jogo'} width={500}>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Escalão" required error={errors.escalao_id}>
            <select className={`admin-select${errors.escalao_id ? ' input-error' : ''}`} value={form.escalao_id}
              onChange={(e) => setForm({ ...form, escalao_id: e.target.value })}>
              <option value="">Selecionar…</option>
              {escaloes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Data" required error={errors.game_date}>
            <input className={`admin-input${errors.game_date ? ' input-error' : ''}`} type="date" value={form.game_date}
              onChange={(e) => setForm({ ...form, game_date: e.target.value })} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Adversário" required error={errors.opponent}>
              <input autoFocus className={`admin-input${errors.opponent ? ' input-error' : ''}`} value={form.opponent}
                onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="Ex: FC Porto" />
            </Field>
          </div>
        </div>
        <ModalFooter onCancel={close} onSave={save} saveLabel={editing ? 'Guardar' : 'Adicionar'} />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Jogos</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>+ Novo</button>
        </div>
        {games.length === 0 ? <div className="admin-empty">Ainda não há jogos registados.</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th style={{ width: 110 }}>Data</th>
                <th>Escalão</th>
                <th>Adversário</th>
                <th className="col-right">Ações</th>
              </tr></thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td className="cell-muted">{new Date(g.game_date).toLocaleDateString('pt-PT')}</td>
                    <td className="cell-muted">{g.escaloes?.name}</td>
                    <td className="cell-primary">{g.opponent}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-success" onClick={() => onSelectGame(g)}>▶ Registar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(g)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(g.id)}>Eliminar</button>
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

// ── Operadores ────────────────────────────────────────────────────────────────

export function OperadoresManager({ clubId }) {
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => { load() }, [clubId])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('club_id', clubId).eq('role', 'club_opp').order('email')
    setUsers(data || [])
  }

  async function toggleAuth(userId, current) {
    await supabase.from('profiles').update({ can_open_games: !current }).eq('id', userId); load()
  }

  function openNew() { setForm({ name: '', email: '', password: '' }); setErrors({}); setApiError(''); setOpen(true) }
  function close()   { setOpen(false) }

  function validate() {
    const e = {}
    if (!form.name.trim())     e.name     = 'Campo obrigatório'
    if (!form.email.trim())    e.email    = 'Campo obrigatório'
    if (!form.password.trim()) e.password = 'Campo obrigatório'
    else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e); return !Object.keys(e).length
  }

  async function save() {
    if (!validate()) return
    setSaving(true); setApiError('')
    const { error: fnError } = await supabase.functions.invoke('create-user', {
      body: { name: form.name, email: form.email, password: form.password, role: 'club_opp', club_id: clubId },
    })
    if (fnError) setApiError(fnError.message)
    else { close(); load() }
    setSaving(false)
  }

  async function remove(userId) {
    if (!confirm('Eliminar operador? Esta ação é irreversível.')) return
    await supabase.functions.invoke('delete-user', { body: { userId } }); load()
  }

  return (
    <>
      <Modal open={open} onClose={close} title="Novo operador" width={480}>
        <div className="admin-form-grid">
          <Field label="Nome" required error={errors.name}>
            <input autoFocus className={`admin-input${errors.name ? ' input-error' : ''}`} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <input className={`admin-input${errors.email ? ' input-error' : ''}`} type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="operador@exemplo.com" />
          </Field>
          <Field label="Password" required error={errors.password}>
            <input className={`admin-input${errors.password ? ' input-error' : ''}`} type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
          </Field>
        </div>
        {apiError && <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>{apiError}</p>}
        <ModalFooter onCancel={close} onSave={save} saving={saving} saveLabel="Criar operador" />
      </Modal>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Operadores do Clube</h2>
          <button className="btn btn-sm btn-primary" onClick={openNew}>+ Novo</button>
        </div>
        {users.length === 0 ? <div className="admin-empty">Ainda não há operadores registados.</div> : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th>Nome</th><th>Email</th>
                <th className="col-center">Pode Abrir Jogos</th>
                <th className="col-right">Ações</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-primary">{u.name || '—'}</td>
                    <td className="cell-muted">{u.email}</td>
                    <td className="col-center">
                      <button onClick={() => toggleAuth(u.id, u.can_open_games)} style={{
                        background: u.can_open_games ? '#dcfce7' : '#fee2e2',
                        color: u.can_open_games ? '#16a34a' : '#dc2626',
                        border: 'none', borderRadius: 20,
                        padding: '3px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      }}>
                        {u.can_open_games ? 'Sim' : 'Não'}
                      </button>
                    </td>
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
    </>
  )
}
