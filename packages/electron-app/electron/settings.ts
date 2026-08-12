import { app, nativeTheme } from 'electron'
import Store from 'electron-store'

export type Theme = 'white' | 'black' | 'color'
export type Language = 'en' | 'th'

export interface SettingsSnapshot {
  theme: Theme
  language: Language
  onboarded: boolean
}

interface StoreSchema {
  theme?: Theme
  language?: Language
  onboarded?: boolean
}

const store = new Store<StoreSchema>({ name: 'settings' })

export function getDefaultLanguage(): Language {
  const locale = app.getLocale() // e.g. "th", "th-TH", "en-US"
  return locale.toLowerCase().startsWith('th') ? 'th' : 'en'
}

export function getDefaultTheme(): Theme {
  return nativeTheme.shouldUseDarkColors ? 'black' : 'white'
}

export function getLanguage(): Language {
  return store.get('language') ?? getDefaultLanguage()
}

export function setLanguage(language: Language): Language {
  store.set('language', language)
  return language
}

export function getTheme(): Theme {
  return store.get('theme') ?? getDefaultTheme()
}

export function setTheme(theme: Theme): Theme {
  store.set('theme', theme)
  return theme
}

export function isOnboarded(): boolean {
  return store.get('onboarded') ?? false
}

export function setOnboarded(): void {
  store.set('onboarded', true)
}

export function getSettingsSnapshot(): SettingsSnapshot {
  return {
    theme: getTheme(),
    language: getLanguage(),
    onboarded: isOnboarded(),
  }
}
