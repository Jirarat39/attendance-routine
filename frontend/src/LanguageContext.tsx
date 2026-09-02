import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'en' | 'th'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function getInitialLanguage(): Language {
  try {
    return localStorage.getItem('hr-report-language') === 'en' ? 'en' : 'th'
  } catch {
    return 'th'
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem('hr-report-language', language)
    } catch {
      // The selected language still works when storage is unavailable.
    }
  }, [language])

  const value = useMemo(() => ({ language, setLanguage }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider.')
  return value
}
