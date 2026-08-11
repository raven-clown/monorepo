import { app, nativeTheme } from 'electron'
import Store from 'electron-store'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type Language = 'en' | 'th'

export interface SettingsSnapshot {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  language: Language
}

interface StoreSchema {
  theme?: ThemePreference
  language?: Language
}

const store = new Store<StoreSchema>({ name: 'settings' })

export function getDefaultLanguage(): Language {
  const locale = app.getLocale() // e.g. "th", "th-TH", "en-US"
  return locale.toLowerCase().startsWith('th') ? 'th' : 'en'
}

export function getLanguage(): Language {
  return store.get('language') ?? getDefaultLanguage()
}

export function setLanguage(language: Language): Language {
  store.set('language', language)
  return language
}

export function getThemePreference(): ThemePreference {
  // unset -> system, which tracks nativeTheme.shouldUseDarkColors until overridden
  return store.get('theme') ?? 'system'
}

export function setThemePreference(theme: ThemePreference): ThemePreference {
  store.set('theme', theme)
  return theme
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }
  return preference
}

export function getSettingsSnapshot(): SettingsSnapshot {
  const theme = getThemePreference()
  return {
    theme,
    resolvedTheme: resolveTheme(theme),
    language: getLanguage(),
  }
}
