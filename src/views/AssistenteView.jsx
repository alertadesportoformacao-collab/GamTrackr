import { useState, useRef, useEffect } from 'react'
import { Send, Bot, RefreshCw } from 'lucide-react'
import { buildClubContext } from '../lib/dataContext'
import { askGemini } from '../lib/gemini'
import { useLanguage } from '../LanguageContext'

export default function AssistenteView({ clubId }) {
  const { t, lang } = useLanguage()
  const [messages, setMessages] = useState(() => [{ role: 'assistant', text: t('assistant.welcome') }])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [ctx, setCtx]           = useState(null)
  const [ctxLoading, setCtxLoading] = useState(false)
  const [history, setHistory]   = useState([])
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  // Reset welcome message when language changes
  useEffect(() => {
    setMessages([{ role: 'assistant', text: t('assistant.welcome') }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function getContext(force = false) {
    if (ctx && !force) return ctx
    setCtxLoading(true)
    try {
      const c = await buildClubContext(clubId)
      setCtx(c)
      return c
    } finally {
      setCtxLoading(false)
    }
  }

  async function send() {
    const question = input.trim()
    if (!question || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setLoading(true)
    try {
      const context = await getContext()
      const answer = await askGemini(question, context, history, lang)
      setHistory((prev) => [...prev, { question, answer }])
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${err.message}`, error: true }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  async function refresh() {
    setCtx(null)
    setHistory([])
    setMessages([{ role: 'assistant', text: t('assistant.refreshed') }])
    await getContext(true)
  }

  function autoResize(e) {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  if (!clubId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
        <Bot size={40} className="mb-4" style={{ color: 'var(--tx5)' }} />
        <p className="text-sm" style={{ color: 'var(--tx4)' }}>{t('assistant.select_club')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--bd)', background: 'var(--bg-s)' }}>
        <div className="flex items-center gap-2">
          <Bot size={17} style={{ color: '#38bdf8' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>
            {t('page.assistant')}
          </span>
          {ctxLoading && (
            <span className="text-xs" style={{ color: 'var(--tx4)' }}>{t('assistant.loading_data')}</span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={ctxLoading || loading}
          className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity disabled:opacity-40"
          style={{ color: 'var(--tx4)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          <RefreshCw size={12} className={ctxLoading ? 'animate-spin' : ''} />
          {t('action.refresh_data')}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                <Bot size={14} />
              </div>
            )}
            <div
              className="max-w-[78%] px-4 py-2.5 text-sm leading-relaxed"
              style={{
                background: msg.role === 'user' ? 'rgba(14,165,233,0.85)'
                  : msg.error ? 'rgba(239,68,68,0.08)' : 'var(--bg-c)',
                color: msg.role === 'user' ? 'white'
                  : msg.error ? '#f87171' : 'var(--tx)',
                border: msg.role === 'user' ? 'none'
                  : `1px solid ${msg.error ? 'rgba(239,68,68,0.2)' : 'var(--bd)'}`,
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
              <Bot size={14} />
            </div>
            <div className="px-4 py-3"
              style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: '18px 18px 18px 4px' }}>
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '160ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '320ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3"
        style={{ borderTop: '1px solid var(--bd)', background: 'var(--bg-s)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onInput={autoResize}
            placeholder={t('assistant.placeholder')}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors"
            style={{
              background: 'var(--inp)', border: '1.5px solid var(--bd3)',
              color: 'var(--tx)', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120,
            }}
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className="rounded-xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: '#0ea5e9', color: 'white', border: 'none', cursor: 'pointer', padding: '12px 14px' }}>
            <Send size={16} />
          </button>
        </div>
        <p className="text-[0.65rem] mt-1.5" style={{ color: 'var(--tx5)' }}>
          {t('assistant.hint')}
        </p>
      </div>
    </div>
  )
}
