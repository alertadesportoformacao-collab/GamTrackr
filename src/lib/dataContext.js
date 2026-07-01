import { supabase } from '../supabaseClient'

export async function buildClubContext(clubId) {
  const [escaloeRes, etRes] = await Promise.all([
    supabase.from('escaloes').select('id, name').eq('club_id', clubId),
    supabase.from('event_types').select('id, name, tipo').eq('ativo', true),
  ])

  const escaloes = escaloeRes.data || []
  const eventTypes = etRes.data || []
  const escalaoIds = escaloes.map((e) => e.id)
  const escalaoMap = Object.fromEntries(escaloes.map((e) => [e.id, e.name]))
  const etMap = Object.fromEntries(eventTypes.map((et) => [et.id, et.name]))

  if (!escalaoIds.length) return 'Sem dados disponíveis para este clube.'

  const [playersRes, gamesRes] = await Promise.all([
    supabase.from('players').select('id, name, number, position, escalao_id').in('escalao_id', escalaoIds),
    supabase
      .from('games')
      .select('id, opponent, game_date, escalao_id, status')
      .in('escalao_id', escalaoIds)
      .order('game_date', { ascending: false })
      .limit(100),
  ])

  const players = playersRes.data || []
  const games = gamesRes.data || []
  const gameIds = games.map((g) => g.id)
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p.name]))

  let events = []
  if (gameIds.length) {
    const { data } = await supabase
      .from('game_events')
      .select('game_id, player_id, event_type_id, minute')
      .in('game_id', gameIds)
    events = data || []
  }

  const goalIds = eventTypes.filter((et) => /golo/i.test(et.name)).map((et) => et.id)
  const cardIds = eventTypes.filter((et) => /cartão|cartao/i.test(et.name)).map((et) => et.id)

  let ctx = ''

  ctx += `## Escalões (${escaloes.length})\n`
  for (const e of escaloes) ctx += `- ${e.name}\n`

  ctx += `\n## Jogadores (${players.length})\n`
  for (const p of players) {
    ctx += `- ${p.name} | Nº ${p.number ?? '–'} | ${p.position ?? 'sem posição'} | ${escalaoMap[p.escalao_id] ?? '?'}\n`
  }

  ctx += `\n## Jogos (${games.length})\n`
  for (const g of games) {
    const gEv = events.filter((e) => e.game_id === g.id)
    const date = new Date(g.game_date).toLocaleDateString('pt-PT')
    const golos = gEv.filter((e) => goalIds.includes(e.event_type_id)).length
    const cartoes = gEv.filter((e) => cardIds.includes(e.event_type_id)).length
    const estado = g.status === 'finished' ? 'terminado' : 'activo'
    ctx += `- ${date} vs ${g.opponent} (${escalaoMap[g.escalao_id] ?? '?'}) — ${estado}, ${golos} golo(s), ${cartoes} cartão(ões)\n`
  }

  ctx += `\n## Estatísticas por Jogador\n`
  const stats = {}
  for (const ev of events) {
    if (!ev.player_id) continue
    if (!stats[ev.player_id]) stats[ev.player_id] = {}
    const name = etMap[ev.event_type_id] ?? 'outro'
    stats[ev.player_id][name] = (stats[ev.player_id][name] || 0) + 1
  }
  const entries = Object.entries(stats)
  if (!entries.length) {
    ctx += '(Sem eventos registados)\n'
  } else {
    for (const [pid, pStats] of entries) {
      const pname = playerMap[pid] ?? `Jogador ${pid}`
      const parts = Object.entries(pStats).map(([k, v]) => `${v} ${k}`).join(', ')
      ctx += `- ${pname}: ${parts}\n`
    }
  }

  return ctx
}
