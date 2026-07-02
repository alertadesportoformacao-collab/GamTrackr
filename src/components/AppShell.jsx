import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Radio, CalendarDays, Users, Shield,
  UserCog, Building2, Globe, Zap, UsersRound, LogOut,
  Bell, Menu, X, ChevronRight, MessageSquare,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useTheme } from '../ThemeContext'
import { useLanguage } from '../LanguageContext'
import GameTrackView from '../views/GameTrackView'
import Dashboard from '../views/Dashboard'
import {
  EscaloesManager, PlayersManager, GamesManager, OperadoresManager,
} from '../views/ClubManagers'
import {
  ClubsManager, ModalitiesManager, EventTypesManager, UsersManager,
} from '../views/SuperAdminView'
import AssistenteView from '../views/AssistenteView'
import '../admin.css'

// ── Nav config (uses translation keys) ───────────────────────────────────────

const NAV = {
  admin_club: [
    { id: 'dashboard',  labelKey: 'nav.dashboard',   icon: LayoutDashboard },
    { id: 'live',       labelKey: 'nav.live',         icon: Radio },
    { id: 'jogos',      labelKey: 'nav.games',        icon: CalendarDays },
    { id: 'jogadores',  labelKey: 'nav.players',      icon: Users },
    { id: 'equipas',    labelKey: 'nav.teams',        icon: Shield },
    { id: 'operadores', labelKey: 'nav.operators',    icon: UserCog },
    { id: 'assistente', labelKey: 'nav.assistant',    icon: MessageSquare },
  ],
  club_opp: [
    { id: 'jogos',      labelKey: 'nav.games',        icon: CalendarDays },
  ],
  super_admin: [
    { id: 'dashboard',    labelKey: 'nav.dashboard',   icon: LayoutDashboard, section: 'global' },
    { id: 'clubs',        labelKey: 'nav.clubs',        icon: Building2 },
    { id: 'modalities',   labelKey: 'nav.modalities',  icon: Globe },
    { id: 'eventTypes',   labelKey: 'nav.event_types', icon: Zap },
    { id: 'users',        labelKey: 'nav.users',        icon: UsersRound },
    { id: 'assistente',   labelKey: 'nav.assistant',   icon: MessageSquare },
    { id: 'escaloes',     labelKey: 'nav.escaloes',    icon: Shield,     section: 'club', clubOnly: true },
    { id: 'sa-jogadores', labelKey: 'nav.players',     icon: Users,      clubOnly: true },
    { id: 'sa-jogos',     labelKey: 'nav.games',       icon: CalendarDays, clubOnly: true },
    { id: 'operadores',   labelKey: 'nav.operators',   icon: UserCog,    clubOnly: true },
  ],
}

const PAGE_KEY = {
  dashboard: 'page.dashboard', live: 'page.live', jogos: 'page.games',
  jogadores: 'page.players', equipas: 'page.teams', operadores: 'page.operators',
  assistente: 'page.assistant', clubs: 'page.clubs', modalities: 'page.modalities',
  eventTypes: 'page.event_types', users: 'page.users', escaloes: 'page.escaloes',
  'sa-jogadores': 'page.players', 'sa-jogos': 'page.games',
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export default function AppShell({ profile, onLogout }) {
  const { toggle, dark } = useTheme()
  const { t, lang, setLanguage, languages } = useLanguage()
  const defaultTab = profile.role === 'club_opp' ? 'jogos' : 'dashboard'
  const [activeTab, setActiveTab]       = useState(defaultTab)
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedMode, setSelectedMode] = useState('realtime')
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [isOnline, setIsOnline]         = useState(navigator.onLine)
  const [clubs, setClubs]               = useState([])
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
    setSelectedGame(game); setSelectedMode(mode)
  }

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

  function renderContent() {
    const wrap = (children) => (
      <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</div>
    )
    switch (activeTab) {
      case 'dashboard':   return <Dashboard profile={profile} onSelectGame={openGame} />
      case 'live':
      case 'jogos':
      case 'sa-jogos':
        if (profile.role === 'club_opp') return wrap(<ClubOppGames clubId={clubId} onSelectGame={openGame} t={t} />)
        if (profile.role === 'super_admin' && !managedClubId) return <ClubRequired t={t} />
        return wrap(<GamesManager clubId={clubId} onSelectGame={openGame} />)
      case 'jogadores':   return wrap(<PlayersManager clubId={clubId} />)
      case 'equipas':
      case 'escaloes':
        if (profile.role === 'super_admin' && !managedClubId) return <ClubRequired t={t} />
        return wrap(<EscaloesManager clubId={clubId} />)
      case 'operadores':
        if (profile.role === 'super_admin' && !managedClubId) return <ClubRequired t={t} />
        return wrap(<OperadoresManager clubId={clubId} />)
      case 'sa-jogadores':
        if (!managedClubId) return <ClubRequired t={t} />
        return wrap(<PlayersManager clubId={clubId} />)
      case 'clubs':       return wrap(<ClubsManager onClubsChange={setClubs} />)
      case 'modalities':  return wrap(<ModalitiesManager />)
      case 'eventTypes':  return wrap(<EventTypesManager />)
      case 'users':       return wrap(<UsersManager />)
      case 'assistente':  return <AssistenteView clubId={clubId} />
      default:            return null
    }
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--tx)' }}>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ background: 'var(--bg-s)', borderRight: '1px solid var(--bd)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bd)' }}>
          <img src="/gamtrakr-logo.png" alt="GamTrakr" style={{ height: 100, width: 'auto', maxWidth: 204 }} />
          <button onClick={() => setSidebarOpen(false)}
            className="md:hidden hover:opacity-80 transition-opacity"
            style={{ color: 'var(--tx4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isClubOnly = item.clubOnly && profile.role === 'super_admin'
            const disabled = isClubOnly && !managedClubId

            return (
              <div key={item.id}>
                {item.section && (
                  <div className="pt-4 pb-1.5 px-1">
                    <span className="text-[0.6rem] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--tx5)' }}>
                      {item.section === 'global' ? t('nav.section_global') : t('nav.section_club')}
                    </span>
                    {item.section === 'club' && profile.role === 'super_admin' && (
                      <select
                        value={managedClubId}
                        onChange={(e) => setManagedClubId(e.target.value)}
                        className="mt-1.5 w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                        style={{ background: 'var(--inp)', border: '1px solid var(--bd3)', color: 'var(--tx3)' }}
                      >
                        <option value="">{t('action.select_club')}</option>
                        {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                )}

                <button
                  onClick={() => !disabled && navigate(item.id)}
                  disabled={disabled}
                  className={`gt-nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon size={17} />
                  {t(item.labelKey)}
                  {isActive && <ChevronRight size={14} className="ml-auto" style={{ color: 'rgba(56,189,248,0.6)' }} />}
                </button>
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--bd)' }}>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(profile.name || profile.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>
                {profile.name || 'Utilizador'}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--tx4)' }}>{profile.email}</div>
            </div>
            <button onClick={onLogout} title={t('action.logout')}
              className="hover:text-red-400 transition-colors"
              style={{ color: 'var(--tx4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 backdrop-blur-sm flex-shrink-0"
          style={{
            height: 116,
            background: dark ? 'rgba(12,21,37,0.85)' : 'rgba(255,255,255,0.9)',
            borderBottom: '1px solid var(--bd)',
          }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden transition-colors mr-1"
              style={{ color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Menu size={20} />
            </button>
            <h1 className="text-base font-bold" style={{ color: 'var(--tx)' }}>
              {t(PAGE_KEY[activeTab] || 'nav.dashboard')}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Online indicator */}
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="hidden sm:inline">{t(isOnline ? 'status.online' : 'status.offline')}</span>
            </span>

            {/* Theme toggle */}
            <button onClick={toggle} title={t(dark ? 'theme.to_light' : 'theme.to_dark')}
              style={{ color: 'var(--tx4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 4 }}
              className="hover:opacity-80 transition-opacity">
              {dark ? '☀️' : '🌙'}
            </button>

            {/* Language selector */}
            <select
              value={lang}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs rounded-lg focus:outline-none cursor-pointer"
              style={{
                background: 'var(--inp)', border: '1px solid var(--bd)',
                color: 'var(--tx3)', padding: '3px 6px',
              }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.short}</option>
              ))}
            </select>

            <button className="relative transition-colors hover:opacity-80"
              style={{ color: 'var(--tx4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Bell size={18} />
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer">
              {(profile.name || profile.email || '?')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">{renderContent()}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex flex-shrink-0 safe-area-bottom"
          style={{ borderTop: '1px solid var(--bd)', background: 'var(--bg-s)' }}>
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[0.6rem] font-semibold transition-colors"
                style={{ color: isActive ? '#38bdf8' : 'var(--tx5)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Icon size={20} />
                {t(item.labelKey).split(' ')[0]}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

// ── Club Opp ──────────────────────────────────────────────────────────────────

function ClubOppGames({ clubId, onSelectGame, t }) {
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
        <h2 className="admin-card-title">{t('nav.games')}</h2>
        <span className="text-xs" style={{ color: 'var(--tx4)' }}>{t('label.games_count', games.length)}</span>
      </div>
      {games.length === 0 ? (
        <div className="admin-empty">{t('status.loading')}</div>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>{t('label.date')}</th>
                <th>{t('label.squad')}</th>
                <th>{t('label.opponent')}</th>
                <th className="col-center" style={{ width: 100 }}>{t('label.status')}</th>
                <th className="col-right">{t('label.actions')}</th>
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
                      ? <span className="text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{t('status.finished')}</span>
                      : <span className="text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('status.active')}</span>}
                  </td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-success" onClick={() => onSelectGame(g)}>{t('action.open')}</button>
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

function ClubRequired({ t }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
      <Building2 size={40} className="mb-4" style={{ color: 'var(--tx5)' }} />
      <p className="text-sm" style={{ color: 'var(--tx4)' }}>{t('error.select_club')}</p>
    </div>
  )
}
