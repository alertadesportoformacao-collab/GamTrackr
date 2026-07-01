import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { db } from '../db'

export default function GameTrackView({ game, onBack, onLogout, isOnline, userRole }) {
  const [mode, setMode] = useState('realtime') // 'realtime' | 'postmatch'
  const [players, setPlayers] = useState([])
  const [teamEvents, setTeamEvents] = useState([])
  const [playerEvents, setPlayerEvents] = useState([])
  const [postMatchEvents, setPostMatchEvents] = useState([])
  const [registeredCounts, setRegisteredCounts] = useState({})
  const [pendingCount, setPendingCount] = useState(0)

  // ── Cronómetro ──
  const [timerState, setTimerState] = useState('stopped') // 'stopped' | 'running' | 'paused'
  const [elapsed, setElapsed] = useState(0) // segundos
  const intervalRef = useRef(null)

  // ── Estado do jogo ──
  const [gameStatus, setGameStatus] = useState(game.status || 'active')

  // ── YouTube pós-jogo ──
  const initialYtId = game.youtube_url ? extractYouTubeId(game.youtube_url) : null
  const [ytInput, setYtInput]         = useState(game.youtube_url || '')
  const [ytVideoId, setYtVideoId]     = useState(initialYtId)
  const [ytCollapsed, setYtCollapsed] = useState(false)

  // club_opp não pode registar eventos após jogo encerrado
  const isLocked = gameStatus === 'finished' && userRole === 'club_opp'

  async function applyYtUrl() {
    const id = extractYouTubeId(ytInput.trim())
    if (id) {
      setYtVideoId(id)
      await supabase.from('games').update({ youtube_url: ytInput.trim() }).eq('id', game.id)
    } else {
      alert('URL do YouTube inválido. Usa um link do tipo youtube.com/watch?v=... ou youtu.be/...')
    }
  }

  async function handleEndGame() {
    if (!confirm('Encerrar o jogo? Os operadores deixarão de poder registar eventos ao vivo.')) return
    const { error } = await supabase.from('games').update({ status: 'finished' }).eq('id', game.id)
    if (!error) setGameStatus('finished')
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function startTimer() {
    setTimerState('running')
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }
  function pauseTimer() {
    setTimerState('paused')
    clearInterval(intervalRef.current)
  }
  function stopTimer() {
    setTimerState('stopped')
    clearInterval(intervalRef.current)
    setElapsed(0)
  }
  function formatTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  const recalcCounts = useCallback(async (gameId) => {
    let serverEvents = []
    try {
      const { data } = await supabase
        .from('game_events')
        .select('player_id, event_type_id')
        .eq('game_id', gameId)
      serverEvents = data || []
    } catch {
      // offline — count only from local
    }

    const localEvents = (await db.pendingEvents.where('game_id').equals(gameId).toArray())
      .filter((ev) => ev.synced === 0)

    const counts = {}
    ;[...serverEvents, ...localEvents].forEach((ev) => {
      const key = `${ev.player_id}_${ev.event_type_id}`
      counts[key] = (counts[key] || 0) + 1
    })
    setRegisteredCounts(counts)

    const allPending = await db.pendingEvents.where('synced').equals(0).toArray()
    setPendingCount(allPending.length)
  }, [])

  const syncPendingEvents = useCallback(async () => {
    if (!navigator.onLine) return
    const pending = await db.pendingEvents.where('synced').equals(0).toArray()
    if (!pending.length) return
    for (const ev of pending) {
      const { synced, ...eventToSend } = ev
      const { error } = await supabase.from('game_events').insert(eventToSend)
      if (!error) await db.pendingEvents.update(ev.id, { synced: 1 })
    }
    await recalcCounts(game.id)
  }, [game, recalcCounts])

  useEffect(() => {
    async function load() {
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('escalao_id', game.escaloes.id)
        .order('number')

      let etQuery = supabase.from('event_types').select('*').order('sort_order')
      if (game.escaloes?.modality_id) etQuery = etQuery.eq('modality_id', game.escaloes.modality_id)
      const { data: all } = await etQuery

      const types = all || []
      setPlayers(playersData || [])
      setTeamEvents(types.filter((et) => et.registro_tipo === 'realtime' && !et.requer_jogador))
      setPlayerEvents(types.filter((et) => et.registro_tipo === 'realtime' && et.requer_jogador))
      setPostMatchEvents(types.filter((et) => et.registro_tipo === 'postmatch'))
      await recalcCounts(game.id)

      // refresh status/youtube_url from DB in case it changed elsewhere
      const { data: fresh } = await supabase.from('games').select('status, youtube_url').eq('id', game.id).single()
      if (fresh) {
        if (fresh.status) setGameStatus(fresh.status)
        if (fresh.youtube_url && !ytInput) {
          setYtInput(fresh.youtube_url)
          const id = extractYouTubeId(fresh.youtube_url)
          if (id) setYtVideoId(id)
        }
      }
    }
    load()
  }, [game, recalcCounts])

  useEffect(() => {
    const handleOnline = () => syncPendingEvents()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncPendingEvents])

  useEffect(() => {
    const interval = setInterval(syncPendingEvents, 15000)
    return () => clearInterval(interval)
  }, [syncPendingEvents])

  async function registerEvent(player, eventType) {
    if (isLocked) return
    const newEvent = {
      id: crypto.randomUUID(),
      game_id: game.id,
      event_type_id: eventType.id,
      player_id: player?.id ?? null,
      minute: elapsed,
      synced: 0,
    }
    await db.pendingEvents.add(newEvent)
    await recalcCounts(game.id)
    syncPendingEvents()
  }

  const activeEvents = mode === 'realtime' ? playerEvents : postMatchEvents

  return (
    <div style={{ minHeight: '100vh', background: '#0f2744', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '0.6rem 1rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={mode === 'postmatch' ? () => setMode('realtime') : onBack}
            style={btnStyle}
          >
            ← {mode === 'postmatch' ? 'Jogo' : 'Voltar'}
          </button>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              {game.escaloes?.name} vs {game.opponent}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>
              {new Date(game.game_date).toLocaleDateString('pt-PT')}
              {mode === 'postmatch' && (
                <span style={{ marginLeft: '0.5rem', color: '#a78bfa', fontWeight: 700 }}>· Análise Pós-Jogo</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.72rem', color: isOnline ? '#4ade80' : '#f87171', fontWeight: 700 }}>
            {isOnline ? '● Online' : '● Offline'}
          </span>
          {pendingCount > 0 && (
            <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
              {pendingCount} por sync
            </span>
          )}

          {/* Estado do jogo */}
          {gameStatus === 'finished' ? (
            <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
              ⏹ Encerrado
            </span>
          ) : (
            mode === 'realtime' && (
              <button
                onClick={handleEndGame}
                style={{ ...btnStyle, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', color: '#fca5a5' }}
              >
                ⏹ Encerrar Jogo
              </button>
            )
          )}

          {mode === 'realtime' && (
            <button
              onClick={() => setMode('postmatch')}
              style={{ ...btnStyle, background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.35)', color: '#c4b5fd' }}
            >
              📊 Pós-Jogo
            </button>
          )}
          <button onClick={onLogout} style={btnStyle}>Sair</button>
        </div>
      </div>

      {/* ── Aviso jogo encerrado (club_opp) ── */}
      {isLocked && mode === 'realtime' && (
        <div style={{
          background: 'rgba(220,38,38,0.12)', borderBottom: '1px solid rgba(220,38,38,0.25)',
          padding: '0.55rem 1rem', flexShrink: 0,
          fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600, textAlign: 'center',
        }}>
          Jogo encerrado — o registo de eventos está bloqueado.
        </div>
      )}

      {/* ── Cronómetro (realtime only) ── */}
      {mode === 'realtime' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
          padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.35)',
          borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        }}>
          <span style={{
            fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '2rem',
            letterSpacing: '0.05em', color: timerState === 'running' ? '#4ade80' : timerState === 'paused' ? '#fbbf24' : 'rgba(255,255,255,0.5)',
            minWidth: '5ch', textAlign: 'center', transition: 'color 0.2s',
          }}>
            {formatTime(elapsed)}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {!isLocked && (timerState !== 'running' ? (
              <button onClick={startTimer} style={{ ...timerBtn, background: '#16a34a', color: 'white' }}>
                {timerState === 'paused' ? '▶ Retomar' : '▶ Iniciar'}
              </button>
            ) : (
              <button onClick={pauseTimer} style={{ ...timerBtn, background: '#d97706', color: 'white' }}>
                ⏸ Pausar
              </button>
            ))}
            {!isLocked && timerState !== 'stopped' && (
              <button onClick={stopTimer} style={{ ...timerBtn, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
                ⏹ Parar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Team events (realtime only) ── */}
      {mode === 'realtime' && teamEvents.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0.6rem 1rem', flexShrink: 0,
        }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.4)', marginBottom: '0.45rem' }}>
            Eventos de Equipa
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {teamEvents.map((et) => {
              const count = registeredCounts[`null_${et.id}`] || 0
              return (
                <button
                  key={et.id}
                  onClick={() => registerEvent(null, et)}
                  disabled={isLocked}
                  style={{
                    background: count > 0 ? et.color : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    border: `2px solid ${count > 0 ? et.color : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: 8,
                    padding: '0.4rem 0.85rem',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: isLocked ? 0.45 : 1,
                    transition: 'background 0.1s',
                  }}
                >
                  {et.name}
                  {count > 0 && (
                    <span style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0 6px', fontSize: '0.78rem' }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── YouTube panel (postmatch only) ── */}
      {mode === 'postmatch' && (
        <div style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          {/* URL bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}>
            <span style={{ fontSize: '0.95rem' }}>▶️</span>
            <input
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyYtUrl()}
              placeholder="https://www.youtube.com/watch?v=..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6, padding: '0.38rem 0.75rem', color: 'white', fontSize: '0.82rem',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={applyYtUrl} style={{ ...btnStyle, background: '#1d4ed8', border: 'none' }}>
              Guardar
            </button>
            {ytVideoId && (
              <button onClick={() => setYtCollapsed((c) => !c)} style={btnStyle}>
                {ytCollapsed ? '▼ Mostrar' : '▲ Minimizar'}
              </button>
            )}
            {ytVideoId && (
              <button onClick={() => { setYtVideoId(null); setYtInput(''); supabase.from('games').update({ youtube_url: null }).eq('id', game.id) }} style={btnStyle} title="Remover vídeo">
                ✕
              </button>
            )}
          </div>

          {/* iframe */}
          {ytVideoId && !ytCollapsed && (
            <div style={{ padding: '0 1rem 0.75rem' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                <iframe
                  key={ytVideoId}
                  src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?rel=0&modestbranding=1`}
                  title="Vídeo do jogo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                  Se o vídeo não carregar, o dono desactivou o embedding —
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${ytVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}
                >
                  Abrir no YouTube ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Player × event grid ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeEvents.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '3rem 1rem', fontSize: '0.9rem' }}>
            Sem eventos {mode === 'postmatch' ? 'pós-jogo' : 'em tempo real'} configurados.
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 'max-content' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.35)' }}>
                <th style={{
                  position: 'sticky', left: 0, background: '#0a1e38',
                  textAlign: 'left', padding: '7px 12px',
                  fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', minWidth: 130,
                  borderRight: '1px solid rgba(255,255,255,0.1)',
                }}>
                  Evento
                </th>
                {players.map((p) => (
                  <th key={p.id} style={{
                    padding: '6px 3px', fontSize: '0.68rem', minWidth: 64, textAlign: 'center',
                    color: 'rgba(255,255,255,0.6)', fontWeight: 600,
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontWeight: 800, color: 'white', fontSize: '0.8rem' }}>#{p.number}</div>
                    <div style={{ fontSize: '0.62rem', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>
                      {p.name.split(' ')[0]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEvents.map((et, rowIdx) => (
                <tr key={et.id} style={{ background: rowIdx % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
                  <td style={{
                    position: 'sticky', left: 0,
                    background: rowIdx % 2 === 0 ? '#122b4a' : '#0f2744',
                    padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem',
                    whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.88)',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: '50%', background: et.color,
                      display: 'inline-block', marginRight: 7, verticalAlign: 'middle',
                    }} />
                    {et.name}
                  </td>
                  {players.map((p) => {
                    const key = `${p.id}_${et.id}`
                    const count = registeredCounts[key] || 0
                    return (
                      <td key={p.id} style={{ padding: '3px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                          onClick={() => registerEvent(p, et)}
                          disabled={isLocked}
                          style={{
                            width: '100%',
                            minHeight: '42px',
                            background: count > 0 ? et.color : 'rgba(255,255,255,0.06)',
                            color: count > 0 ? 'white' : 'rgba(255,255,255,0.25)',
                            border: `2px solid ${count > 0 ? et.color : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 6,
                            fontWeight: 800,
                            fontSize: count > 0 ? '1.05rem' : '0.7rem',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.45 : 1,
                            transition: 'background 0.1s',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function extractYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

const btnStyle = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: 'white',
  borderRadius: 6,
  padding: '0.32rem 0.7rem',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const timerBtn = {
  border: 'none',
  borderRadius: 8,
  padding: '0.45rem 1.1rem',
  cursor: 'pointer',
  fontSize: '0.88rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
}
