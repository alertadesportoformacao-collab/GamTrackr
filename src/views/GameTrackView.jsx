import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../LanguageContext'
import { db } from '../db'
import '../game-track.css'

export default function GameTrackView({ game, onBack, onLogout, isOnline, userRole, initialMode = 'realtime' }) {
  const { t } = useLanguage()
  const locale = t('locale')
  const [mode, setMode] = useState(initialMode)
  const [players, setPlayers] = useState([])
  const [periodoEvents, setPeriodoEvents] = useState([])
  const [teamEvents, setTeamEvents] = useState([])
  const [playerEvents, setPlayerEvents] = useState([])
  const [postMatchEvents, setPostMatchEvents] = useState([])
  const [registeredCounts, setRegisteredCounts] = useState({})
  const [pendingCount, setPendingCount] = useState(0)

  const [activePeriods, setActivePeriods] = useState({})
  const [periodTick, setPeriodTick] = useState(0)

  const [timerState, setTimerState] = useState('stopped')
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  const [gameStatus, setGameStatus] = useState(game.status || 'active')

  const initialYtId = game.youtube_url ? extractYouTubeId(game.youtube_url) : null
  const [ytInput, setYtInput]         = useState(game.youtube_url || '')
  const [ytVideoId, setYtVideoId]     = useState(initialYtId)
  const [ytCollapsed, setYtCollapsed] = useState(false)

  const isLocked = gameStatus === 'finished' && userRole === 'club_opp'

  useEffect(() => {
    if (Object.keys(activePeriods).length === 0) return
    const iv = setInterval(() => setPeriodTick((t) => t + 1), 1000)
    return () => clearInterval(iv)
  }, [activePeriods])

  async function applyYtUrl() {
    const id = extractYouTubeId(ytInput.trim())
    if (id) {
      setYtVideoId(id)
      await supabase.from('games').update({ youtube_url: ytInput.trim() }).eq('id', game.id)
    } else {
      alert(t('confirm.invalid_yt'))
    }
  }

  async function handleEndGame() {
    if (!confirm(t('confirm.end_game'))) return
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
      const { data } = await supabase.from('game_events').select('player_id, event_type_id').eq('game_id', gameId)
      serverEvents = data || []
    } catch { /* offline */ }

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
        .from('players').select('*').eq('escalao_id', game.escaloes.id).order('number')

      let etQuery = supabase.from('event_types').select('*').order('sort_order')
      if (game.escaloes?.modality_id) etQuery = etQuery.eq('modality_id', game.escaloes.modality_id)
      const { data: all } = await etQuery

      const types = (all || []).filter((et) => et.ativo !== false)
      const isLive = (et) => {
        const m = et.modo || (et.registro_tipo === 'postmatch' ? 'pos_jogo' : 'live')
        return m === 'live' || m === 'ambos'
      }
      const isPost = (et) => {
        const m = et.modo || (et.registro_tipo === 'postmatch' ? 'pos_jogo' : 'live')
        return m === 'pos_jogo' || m === 'ambos'
      }
      const liveTypes = types.filter(isLive)
      setPlayers(playersData || [])
      setPeriodoEvents(liveTypes.filter((et) => et.tipo === 'periodo'))
      setTeamEvents(liveTypes.filter((et) => !et.requer_jogador && et.tipo !== 'periodo'))
      setPlayerEvents(liveTypes.filter((et) => et.requer_jogador && et.tipo !== 'periodo'))
      setPostMatchEvents(types.filter(isPost))
      await recalcCounts(game.id)

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

  async function togglePeriodo(et) {
    if (isLocked) return
    const active = activePeriods[et.id]
    if (!active) {
      setActivePeriods((prev) => ({
        ...prev,
        [et.id]: { startGameMinute: elapsed, startWallTime: Date.now() },
      }))
    } else {
      const newEvent = {
        id: crypto.randomUUID(),
        game_id: game.id,
        event_type_id: et.id,
        player_id: null,
        minute: active.startGameMinute,
        minute_end: elapsed,
        synced: 0,
      }
      await db.pendingEvents.add(newEvent)
      await recalcCounts(game.id)
      syncPendingEvents()
      setActivePeriods((prev) => {
        const next = { ...prev }
        delete next[et.id]
        return next
      })
    }
  }

  const activeEvents = mode === 'realtime' ? playerEvents : postMatchEvents
  const timerColor = timerState === 'running' ? '#4ade80' : timerState === 'paused' ? '#fbbf24' : 'rgba(255,255,255,0.5)'

  return (
    <div className="gt-wrap">

      {/* ── Header ── */}
      <div className="gt-header">
        <div className="gt-header-main">
          <div className="gt-header-left">
            <button onClick={onBack} style={btnStyle}>{t('action.back')}</button>
            <div className="gt-title-block">
              <div className="gt-title">{game.escaloes?.name} vs {game.opponent}</div>
              <div className="gt-subtitle">
                {new Date(game.game_date).toLocaleDateString(locale)}
                {mode === 'postmatch' && <span style={{ marginLeft: '0.5rem', color: '#a78bfa', fontWeight: 700 }}>· {t('gt.post_match_tag')}</span>}
              </div>
            </div>
          </div>

          <div className="gt-header-right">
            <span style={{ fontSize: '0.72rem', color: isOnline ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {isOnline ? `● ${t('status.online')}` : `● ${t('status.offline')}`}
            </span>
            {pendingCount > 0 && (
              <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                {t('gt.sync_pending', pendingCount)}
              </span>
            )}
            {gameStatus === 'finished' ? (
              <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                {t('gt.status_finished')}
              </span>
            ) : (
              mode === 'realtime' && (
                <button onClick={handleEndGame}
                  style={{ ...btnStyle, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', color: '#fca5a5' }}>
                  {t('action.end_game')}
                </button>
              )
            )}
            <button onClick={onLogout} style={btnStyle}>{t('action.logout')}</button>
          </div>
        </div>

      </div>

      {/* ── Aviso encerrado ── */}
      {isLocked && mode === 'realtime' && (
        <div className="gt-lock-banner">{t('gt.lock_banner')}</div>
      )}

      {/* ── Períodos + cronómetro (mesma linha) ── */}
      {mode === 'realtime' && (
        <div className="gt-periodo-events">
          <div className="gt-team-label">{t('gt.periods')}</div>
          <div className="gt-periodo-btns">

            {/* Cronómetro */}
            <span className="gt-timer-value" style={{ color: timerColor }}>{formatTime(elapsed)}</span>
            {!isLocked && (timerState !== 'running'
              ? <button onClick={startTimer} style={{ ...timerBtn, background: '#16a34a', color: 'white' }}>
                  {timerState === 'paused' ? t('action.resume_timer') : t('action.start_timer')}
                </button>
              : <button onClick={pauseTimer} style={{ ...timerBtn, background: '#d97706', color: 'white' }}>
                  {t('action.pause_timer')}
                </button>
            )}
            {!isLocked && timerState !== 'stopped' && (
              <button onClick={stopTimer} style={{ ...timerBtn, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {t('action.stop_timer')}
              </button>
            )}

            {/* Separador visual */}
            {periodoEvents.length > 0 && (
              <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.15)', margin: '0 0.25rem', flexShrink: 0 }} />
            )}

            {/* Botões de período */}
            {periodoEvents.map((et) => {
              const active = activePeriods[et.id]
              const secs = active ? Math.floor((Date.now() - active.startWallTime) / 1000) : 0
              const count = registeredCounts[`null_${et.id}`] || 0
              return (
                <button key={et.id} onClick={() => togglePeriodo(et)} disabled={isLocked}
                  className="gt-periodo-btn"
                  style={{
                    background: active ? et.color : 'rgba(255,255,255,0.07)',
                    border: `2px solid ${active ? et.color : 'rgba(255,255,255,0.18)'}`,
                    opacity: isLocked ? 0.45 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                  }}>
                  <span>{et.name}</span>
                  {active
                    ? <span className="gt-periodo-timer">{formatTime(secs)}</span>
                    : count > 0 && (
                      <span style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0 6px', fontSize: '0.78rem' }}>
                        {count}×
                      </span>
                    )
                  }
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Eventos de equipa ── */}
      {mode === 'realtime' && teamEvents.length > 0 && (
        <div className="gt-team-events">
          <div className="gt-team-label">{t('gt.team_events')}</div>
          <div className="gt-team-btns">
            {teamEvents.map((et) => {
              const count = registeredCounts[`null_${et.id}`] || 0
              return (
                <button key={et.id} onClick={() => registerEvent(null, et)} disabled={isLocked}
                  style={{
                    background: count > 0 ? et.color : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    border: `2px solid ${count > 0 ? et.color : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: 8, padding: '0.4rem 0.85rem',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '0.82rem',
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    opacity: isLocked ? 0.45 : 1,
                    touchAction: 'manipulation', userSelect: 'none',
                  }}>
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

      {/* ── YouTube panel (pós-jogo) ── */}
      {mode === 'postmatch' && (
        <div className="gt-yt-panel">
          <div className="gt-yt-bar">
            <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>▶️</span>
            <input className="gt-yt-input" value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyYtUrl()}
              placeholder="https://www.youtube.com/watch?v=..." />
            <button onClick={applyYtUrl} style={{ ...btnStyle, background: '#1d4ed8', border: 'none', flexShrink: 0 }}>
              {t('action.save')}
            </button>
            {ytVideoId && (
              <button onClick={() => setYtCollapsed((c) => !c)} style={{ ...btnStyle, flexShrink: 0 }}>
                {ytCollapsed ? '▼' : '▲'}
              </button>
            )}
            {ytVideoId && (
              <button onClick={() => { setYtVideoId(null); setYtInput(''); supabase.from('games').update({ youtube_url: null }).eq('id', game.id) }}
                style={{ ...btnStyle, flexShrink: 0 }} title={t('gt.remove_video')}>✕</button>
            )}
          </div>
          {ytVideoId && !ytCollapsed && (
            <div className="gt-yt-embed">
              <div className="gt-yt-ratio">
                <iframe key={ytVideoId}
                  src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?rel=0&modestbranding=1`}
                  title={t('gt.video_title')}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen />
              </div>
              <div className="gt-yt-fallback">
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                  {t('gt.video_fallback')}
                </span>
                <a href={`https://www.youtube.com/watch?v=${ytVideoId}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
                  {t('action.open_youtube')}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Grelha jogador × evento ── */}
      <div className="gt-grid">
        {activeEvents.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '3rem 1rem', fontSize: '0.9rem' }}>
            {t('empty.events_configured', mode)}
          </div>
        ) : (
          <table className="gt-table">
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.35)' }}>
                <th className="gt-col-event">{t('col.event')}</th>
                {players.map((p) => (
                  <th key={p.id} className="gt-col-player">
                    <div className="gt-player-num">#{p.number}</div>
                    <div className="gt-player-name">{p.name.split(' ')[0]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEvents.map((et, rowIdx) => {
                const evenBg = rowIdx % 2 === 0
                return (
                  <tr key={et.id} style={{ background: evenBg ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
                    <td className="gt-row-event" style={{ background: evenBg ? '#122b4a' : '#0f2744' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: et.color, display: 'inline-block', marginRight: 7, verticalAlign: 'middle' }} />
                      {et.name}
                    </td>
                    {players.map((p) => {
                      const count = registeredCounts[`${p.id}_${et.id}`] || 0
                      return (
                        <td key={p.id} className="gt-cell">
                          <button className="gt-event-btn" onClick={() => registerEvent(p, et)} disabled={isLocked}
                            style={{
                              background: count > 0 ? et.color : 'rgba(255,255,255,0.06)',
                              color: count > 0 ? 'white' : 'rgba(255,255,255,0.25)',
                              border: `2px solid ${count > 0 ? et.color : 'rgba(255,255,255,0.08)'}`,
                              fontSize: count > 0 ? '1.05rem' : '0.7rem',
                              cursor: isLocked ? 'not-allowed' : 'pointer',
                              opacity: isLocked ? 0.45 : 1,
                            }}>
                            {count > 0 ? count : ''}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
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
  color: 'white', borderRadius: 6,
  padding: '0.32rem 0.7rem',
  cursor: 'pointer', fontSize: '0.82rem',
  fontWeight: 600, whiteSpace: 'nowrap',
}

const timerBtn = {
  border: 'none', borderRadius: 6,
  padding: '0.28rem 0.75rem',
  cursor: 'pointer', fontSize: '0.82rem',
  fontWeight: 700, whiteSpace: 'nowrap',
}
