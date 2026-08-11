import { useCallback, useEffect, useState } from 'react'
import { translate, type Language, type TranslationKey } from '../i18n'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface SettingsSnapshot {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  language: Language
}

const FALLBACK: SettingsSnapshot = { theme: 'system', resolvedTheme: 'light', language: 'en' }

export function useSettings() {
  const [settings, setSettings] = useState<SettingsSnapshot>(FALLBACK)

  useEffect(() => {
    window.api.settings.get().then(setSettings)
    return window.api.settings.onChange(setSettings)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.resolvedTheme)
  }, [settings.resolvedTheme])

  const setTheme = useCallback((theme: ThemePreference) => {
    window.api.settings.setTheme(theme).then(setSettings)
  }, [])

  const setLanguage = useCallback((language: Language) => {
    window.api.settings.setLanguage(language).then(setSettings)
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(settings.language, key, vars),
    [settings.language]
  )

  return { ...settings, setTheme, setLanguage, t }
}
