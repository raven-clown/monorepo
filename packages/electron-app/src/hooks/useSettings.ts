import { useCallback, useEffect, useState } from 'react'
import { translate, type Language, type TranslationKey } from '../i18n'

export type Theme = 'white' | 'black' | 'color'

interface SettingsSnapshot {
  theme: Theme
  language: Language
  onboarded: boolean
}

const FALLBACK: SettingsSnapshot = { theme: 'white', language: 'en', onboarded: true }

export function useSettings() {
  const [settings, setSettings] = useState<SettingsSnapshot>(FALLBACK)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.settings.get().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
    return window.api.settings.onChange(setSettings)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const setTheme = useCallback((theme: Theme) => {
    window.api.settings.setTheme(theme).then(setSettings)
  }, [])

  const setLanguage = useCallback((language: Language) => {
    window.api.settings.setLanguage(language).then(setSettings)
  }, [])

  const finishOnboarding = useCallback(() => {
    window.api.settings.setOnboarded().then(setSettings)
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(settings.language, key, vars),
    [settings.language]
  )

  return { ...settings, loaded, setTheme, setLanguage, finishOnboarding, t }
}
