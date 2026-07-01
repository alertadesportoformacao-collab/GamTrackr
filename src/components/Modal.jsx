import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, width = 560 }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,36,0.52)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-c)', borderRadius: 14, width: '100%', maxWidth: width,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        border: '1px solid var(--bd)',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', animation: 'modalIn 0.16s ease-out',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--bd)', flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--tx)', letterSpacing: '-0.01em' }}>
            {title}
          </h3>
          <button onClick={onClose} aria-label="Fechar" style={{
            background: 'var(--hv2)', border: '1px solid var(--bd3)', borderRadius: 6,
            width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--tx3)', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0,
          }}>×</button>
        </div>
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
