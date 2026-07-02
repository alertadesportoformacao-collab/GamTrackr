import { createContext, useContext, useState } from 'react'
import T, { LANGUAGES } from './i18n/translations'

const Ctx = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('gt-lang') || 'pt')

  function t(key, ...args) {
    const val = T[lang]?.[key] ?? T.pt?.[key] ?? key
    return typeof val === 'function' ? val(...args) : val
  }

  function setLanguage(code) {
    setLang(code)
    localStorage.setItem('gt-lang', code)
  }

  return (
    <Ctx.Provider value={{ lang, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </Ctx.Provider>
  )
}

export const useLanguage = () => useContext(Ctx)
