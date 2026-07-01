import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { CalendarDays, Users, Zap, Shield, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'

export default function Dashboard({ profile, onSelectGame }) {
  const [stats, setStats]         = useState({ games: 0, players: 0, events: 0, teams: 0 })
  const [liveGames, setLiveGames] = useState([])
  const [recentGames, setRecentGames] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadAll() }, [profile])

  async function loadAll() {
    setLoading(true)
    try {
      // For admin_club → RLS filters to their club automatically
      // For super_admin → sees all
      const [gamesRes, eventsRes, escaloes, recentRes] = await Promise.all([
        supabase.from('games').select('id, status, game_date, opponent, escaloes(id, name)', { count: 'exact' }).order('game_date', { ascending: false }).limit(100),
        supabase.from('game_events').select('id', { count: 'exact', head: true }),
        supabase.from('escaloes').select('id, club_id', { count: 'exact', head: true }),
        supabase.from('games').select('*, escaloes(id, name, modality_id)').order('game_date', { ascending: false }).limit(5),
      ])

      const allGames = gamesRes.data || []
      const today = new Date().toISOString().slice(0, 10)

      // Players — via escaloes ids
      let playerCount = 0
      if (escaloes.data?.length) {
        const ids = escaloes.data.map((e) => e.id)
        const { count } = await supabase.from('players').select('id', { count: 'exact', head: true }).in('escalao_id', ids)
        playerCount = count || 0
      }

      setStats({
        games:   allGames.length,
        players: playerCount,
        events:  eventsRes.count || 0,
        teams:   escaloes.count || 0,
      })

      setLiveGames(allGames.filter((g) => g.status === 'active' && g.game_date?.slice(0, 10) === today))
      setRecentGames(recentRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  const metricCards = [
    { label: 'Jogos',            value: stats.games,   icon: CalendarDays, color: 'sky' },
    { label: 'Jogadores',        value: stats.players, icon: Users,        color: 'violet' },
    { label: 'Eventos Registados', value: stats.events, icon: Zap,         color: 'amber' },
    { label: 'Equipas',          value: stats.teams,   icon: Shield,       color: 'emerald' },
  ]

  const colorMap = {
    sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     icon: 'text-sky-400',     text: 'text-sky-400' },
    violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: 'text-violet-400',  text: 'text-violet-400' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400',   text: 'text-amber-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', text: 'text-emerald-400' },
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">

      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          Olá, {profile.name?.split(' ')[0] || 'Utilizador'} 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">Aqui está o resumo de actividade.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {metricCards.map(({ label, value, icon: Icon, color }) => {
          const c = colorMap[color]
          return (
            <div key={label} className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4 md:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                  <Icon size={18} className={c.icon} />
                </div>
                <TrendingUp size={14} className="text-slate-700" />
              </div>
              <div className={`text-2xl md:text-3xl font-black ${loading ? 'animate-pulse text-slate-700' : 'text-white'}`}>
                {loading ? '—' : value.toLocaleString('pt-PT')}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* Live Matches */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Jogos ao Vivo</h3>
            </div>
            <span className="text-xs text-slate-600">{new Date().toLocaleDateString('pt-PT')}</span>
          </div>

          {liveGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Clock size={28} className="text-slate-700 mb-3" />
              <p className="text-slate-600 text-sm">Sem jogos ao vivo hoje.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {liveGames.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-white">{g.escaloes?.name} vs {g.opponent}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{new Date(g.game_date).toLocaleDateString('pt-PT')}</div>
                  </div>
                  <button
                    onClick={() => onSelectGame(g)}
                    className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-sky-500/20 transition-colors"
                  >
                    ▶ Abrir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Matches */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white">Jogos Recentes</h3>
            <CalendarDays size={15} className="text-slate-600" />
          </div>

          {recentGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <CalendarDays size={28} className="text-slate-700 mb-3" />
              <p className="text-slate-600 text-sm">Ainda não há jogos registados.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentGames.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      g.status === 'finished'
                        ? 'bg-slate-700/50'
                        : 'bg-sky-500/10 border border-sky-500/20'
                    }`}>
                      {g.status === 'finished'
                        ? <CheckCircle2 size={14} className="text-slate-500" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{g.escaloes?.name} vs {g.opponent}</div>
                      <div className="text-xs text-slate-600">{new Date(g.game_date).toLocaleDateString('pt-PT')}</div>
                    </div>
                  </div>
                  <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    g.status === 'finished'
                      ? 'bg-slate-700/50 text-slate-500'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {g.status === 'finished' ? 'Encerrado' : 'Activo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
