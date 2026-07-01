import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Radio, CalendarDays, Users, Shield,
  UserCog, Building2, Globe, Zap, UsersRound, LogOut,
  Bell, Menu, X, ChevronRight,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import GameTrackView from '../views/GameTrackView'
import Dashboard from '../views/Dashboard'
import {
  EscaloesManager, PlayersManager, GamesManager, OperadoresManager,
} from '../views/ClubManagers'
import {
  ClubsManager, ModalitiesManager, EventTypesManager, UsersManager,
} from '../views/SuperAdminView'
import '../admin.css'

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV = {
  admin_club: [
    { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
    { id: 'live',        label: 'Jogos ao Vivo', icon: Radio },
    { id: 'jogos',       label: 'Jogos',         icon: CalendarDays },
    { id: 'jogadores',   label: 'Jogadores',     icon: Users },
    { id: 'equipas',     label: 'Equipas',       icon: Shield },
    { id: 'operadores',  label: 'Operadores',    icon: UserCog },
  ],
  club_opp: [
    { id: 'jogos', label: 'Jogos', icon: CalendarDays },
  ],
  super_admin: [
    { id: 'dashboard',   label: 'Dashboard',       icon: LayoutDashboard, section: 'Gestão Global' },
    { id: 'clubs',       label: 'Clubes',           icon: Building2 },
    { id: 'modalities',  label: 'Modalidades',      icon: Globe },
    { id: 'eventTypes',  label: 'Ações de Jogo',    icon: Zap },
    { id: 'users',       label: 'Utilizadores',     icon: UsersRound },
    { id: 'escaloes',    label: 'Escalões',         icon: Shield,     section: 'Gerir Clube', clubOnly: true },
    { id: 'sa-jogadores',label: 'Jogadores',        icon: Users,      clubOnly: true },
    { id: 'sa-jogos',    label: 'Jogos',            icon: CalendarDays, clubOnly: true },
    { id: 'operadores',  label: 'Operadores',       icon: UserCog,    clubOnly: true },
  ],
}

const PAGE_TITLES = {
  dashboard: 'Dashboard', live: 'Jogos ao Vivo', jogos: 'Jogos',
  jogadores: 'Jogadores', equipas: 'Equipas', operadores: 'Operadores',
  clubs: 'Clubes', modalities: 'Modalidades', eventTypes: 'Ações de Jogo',
  users: 'Utilizadores', escaloes: 'Escalões',
  'sa-jogadores': 'Jogadores', 'sa-jogos': 'Jogos',
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export default function AppShell({ profile, onLogout }) {
  const defaultTab = profile.role === 'club_opp' ? 'jogos' : 'dashboard'
  const [activeTab, setActiveTab]     = useState(defaultTab)
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedMode, setSelectedMode] = useState('realtime')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline]       = useState(navigator.onLine)
  // super_admin club management
  const [clubs, setClubs]             = useState([])
  const [managedClubId, setManagedClubId] = useState('')

  useEffect(() => {
    const up = () => setIsOnline(true), down = () => setIsOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  useEffect(() => {
    if (profile.role === 'super_admin') {
      supabase.from('clubs').select('*').order('name').then(({ data }) => setClubs(data || []))
    }
  }, [profile.role])

  function openGame(game, mode = 'realtime') {
    setSelectedGame(game)
    setSelectedMode(mode)
  }

  // Full-screen game tracking
  if (selectedGame) {
    return (
      <GameTrackView
        game={selectedGame}
        initialMode={selectedMode}
        onBack={() => setSelectedGame(null)}
        onLogout={onLogout}
        isOnline={isOnline}
        userRole={profile.role}
      />
    )
  }

  const navItems = NAV[profile.role] || NAV.admin_club
  const clubId   = profile.role === 'super_admin' ? managedClubId : profile.club_id

  function navigate(id) { setActiveTab(id); setSidebarOpen(false) }

  // ── Content renderer ────────────────────────────────────────────────────────
  function renderContent() {
    const wrap = (children) => (
      <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</div>
    )

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard profile={profile} onSelectGame={openGame} />

      case 'live':
      case 'jogos':
      case 'sa-jogos':
        if (profile.role === 'club_opp') return wrap(<ClubOppGames clubId={clubId} onSelectGame={openGame} />)
        if (profile.role === 'super_admin' && !managedClubId) return <ClubRequired />
        return wrap(<GamesManager clubId={clubId} onSelectGame={openGame} />)

      case 'jogadores':
        return wrap(<PlayersManager clubId={clubId} />)

      case 'equipas':
      case 'escaloes':
        if (profile.role === 'super_admin' && !managedClubId) return <ClubRequired />
        return wrap(<EscaloesManager clubId={clubId} />)

      case 'operadores':
        if (profile.role === 'super_admin' && !managedClubId) return <ClubRequired />
        return wrap(<OperadoresManager clubId={clubId} />)

      case 'sa-jogadores':
        if (!managedClubId) return <ClubRequired />
        return wrap(<PlayersManager clubId={clubId} />)

      case 'clubs':
        return wrap(<ClubsManager onClubsChange={setClubs} />)

      case 'modalities':
        return wrap(<ModalitiesManager />)

      case 'eventTypes':
        return wrap(<EventTypesManager />)

      case 'users':
        return wrap(<UsersManager />)

      default:
        return null
    }
  }

  return (
    <div className="flex h-[100dvh] bg-[#070c14] text-slate-100 overflow-hidden">

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col
        bg-[#0c1525] border-r border-white/[0.07]
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.07] flex-shrink-0">
          <img src="/gamtrakr-icon.png" alt="GamTrakr" className="h-9 w-auto" />
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item, i) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isClubOnly = item.clubOnly && profile.role === 'super_admin'
            const disabled = isClubOnly && !managedClubId

            return (
              <div key={item.id}>
                {/* Section header */}
                {item.section && (
                  <div className="pt-4 pb-1.5 px-3">
                    <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-600">
                      {item.section}
                    </span>
                    {item.section === 'Gerir Clube' && profile.role === 'super_admin' && (
                      <select
                        value={managedClubId}
                        onChange={(e) => setManagedClubId(e.target.value)}
                        className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50"
                      >
                        <option value="">Selecionar clube…</option>
                        {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                )}

                <button
                  onClick={() => !disabled && navigate(item.id)}
                  disabled={disabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                      : disabled
                        ? 'text-slate-700 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                  `}
                >
                  <Icon size={17} className={isActive ? 'text-sky-400' : ''} />
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-sky-400/60" />}
                </button>
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/[0.07] p-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(profile.name || profile.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{profile.name || 'Utilizador'}</div>
              <div className="text-xs text-slate-500 truncate">{profile.email}</div>
            </div>
            <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-white/[0.07] bg-[#0c1525]/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white transition-colors mr-1"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-bold text-white">{PAGE_TITLES[activeTab] || ''}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Online indicator */}
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </span>

            <button className="relative text-slate-500 hover:text-white transition-colors">
              <Bell size={18} />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer">
              {(profile.name || profile.email || '?')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="md:hidden flex border-t border-white/[0.07] bg-[#0c1525] flex-shrink-0 safe-area-bottom">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[0.6rem] font-semibold transition-colors ${
                  isActive ? 'text-sky-400' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <Icon size={20} />
                {item.label.split(' ')[0]}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

// ── Club Opp: read-only games list ────────────────────────────────────────────

function ClubOppGames({ clubId, onSelectGame }) {
  const [games, setGames] = useState([])

  useEffect(() => {
    async function load() {
      const { data: escData } = await supabase.from('escaloes').select('id').eq('club_id', clubId)
      const ids = (escData || []).map((e) => e.id)
      if (!ids.length) { setGames([]); return }
      const { data } = await supabase
        .from('games').select('*, escaloes(id, name, modality_id)')
        .in('escalao_id', ids).order('game_date', { ascending: false })
      setGames(data || [])
    }
    if (clubId) load()
  }, [clubId])

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Jogos</h2>
        <span className="text-xs text-slate-500">{games.length} jogo{games.length !== 1 ? 's' : ''}</span>
      </div>
      {games.length === 0 ? (
        <div className="admin-empty">Não há jogos disponíveis.</div>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Data</th>
                <th>Plantel</th>
                <th>Adversário</th>
                <th className="col-center" style={{ width: 100 }}>Estado</th>
                <th className="col-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td className="cell-muted">{new Date(g.game_date).toLocaleDateString('pt-PT')}</td>
                  <td className="cell-muted">{g.escaloes?.name}</td>
                  <td className="cell-primary">{g.opponent}</td>
                  <td className="col-center">
                    {g.status === 'finished'
                      ? <span className="text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Encerrado</span>
                      : <span className="text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Activo</span>}
                  </td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-success" onClick={() => onSelectGame(g)}>▶ Abrir</button>
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

function ClubRequired() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
      <Building2 size={40} className="text-slate-700 mb-4" />
      <p className="text-slate-500 text-sm">Seleciona um clube na barra lateral para gerir os seus dados.</p>
    </div>
  )
}
