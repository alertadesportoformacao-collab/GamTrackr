import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { db } from '../db'

export default function GameTrackView({ game, onBack, onLogout, isOnline }) {
  const [players, setPlayers] = useState([])
  const [eventTypes, setEventTypes] = useState([])
  const [registeredCounts, setRegisteredCounts] = useState({})
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', game.teams.id)
        .order('number')

      // Filter event types by modality if the team is linked to an escalão
      const { data: teamData } = await supabase
        .from('teams')
        .select('escalao_id, escaloes(modality_id)')
        .eq('id', game.teams.id)
        .single()

      let etQuery = supabase.from('event_types').select('*').order('sort_order')
      if (teamData?.escaloes?.modality_id) {
        etQuery = etQuery.eq('modality_id', teamData.escaloes.modality_id)
      }
      const { data: eventTypesData } = await etQuery

      setPlayers(playersData || [])
      setEventTypes(eventTypesData || [])
      await recalcCounts(game.id)
    }
    load()
  }, [game, recalcCounts])

  const recalcCounts = useCallback(async (gameId) => {
    let serverEvents = []
    try {
      const { data } = await supabase
        .from('game_events')
        .select('player_id, event_type_id')
        .eq('game_id', gameId)
      serverEvents = data || []
    } catch {
      // sem rede — conta apenas a partir dos eventos locais
    }

    const localEvents = await db.pendingEvents.where('game_id').equals(gameId).toArray()

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
    const handleOnline = () => syncPendingEvents()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncPendingEvents])

  useEffect(() => {
    const interval = setInterval(syncPendingEvents, 15000)
    return () => clearInterval(interval)
  }, [syncPendingEvents])

  async function registerEvent(player, eventType) {
    const newEvent = {
      id: crypto.randomUUID(),
      game_id: game.id,
      event_type_id: eventType.id,
      player_id: player.id,
      synced: 0,
    }
    await db.pendingEvents.add(newEvent)
    await recalcCounts(game.id)
    syncPendingEvents()
  }

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <button onClick={onBack}>← Voltar</button>
          <h1 style={{ margin: '0.5rem 0' }}>
            {game.teams?.name} vs {game.opponent}
          </h1>
          <small style={{ color: '#9ca3af' }}>{new Date(game.game_date).toLocaleDateString('pt-PT')}</small>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: isOnline ? 'green' : 'red', fontWeight: 'bold' }}>
            {isOnline ? '● Online' : '● Offline'}
          </div>
          {pendingCount > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{pendingCount} por sincronizar</div>
          )}
          <button onClick={onLogout} style={{ marginTop: '0.5rem' }}>Sair</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'white', textAlign: 'left', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                Evento
              </th>
              {players.map((p) => (
                <th key={p.id} style={{ padding: '4px', fontSize: '0.75rem', minWidth: '70px', textAlign: 'center' }}>
                  #{p.number}<br />{p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eventTypes.map((et) => (
              <tr key={et.id}>
                <td style={{ position: 'sticky', left: 0, background: 'white', padding: '4px 8px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {et.name}
                </td>
                {players.map((p) => {
                  const key = `${p.id}_${et.id}`
                  const count = registeredCounts[key] || 0
                  return (
                    <td key={p.id} style={{ padding: '2px', textAlign: 'center' }}>
                      <button
                        onClick={() => registerEvent(p, et)}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          backgroundColor: et.color,
                          color: 'white',
                          border: count > 0 ? '3px solid black' : 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
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
      </div>
    </div>
  )
}
