import type { Theme } from '../hooks/useSettings'
import type { TranslationKey } from '../i18n'

interface Props {
  value: Theme
  onChange: (theme: Theme) => void
  t: (key: TranslationKey) => string
}

const THEMES: { key: Theme; labelKey: TranslationKey }[] = [
  { key: 'white', labelKey: 'themeWhite' },
  { key: 'black', labelKey: 'themeBlack' },
  { key: 'color', labelKey: 'themeColor' },
]

export function ThemeSwatches({ value, onChange, t }: Props) {
  return (
    <div className="theme-cards">
      {THEMES.map((th) => (
        <button
          key={th.key}
          className={`theme-card ${value === th.key ? 'active' : ''}`}
          onClick={() => onChange(th.key)}
        >
          <span className={`theme-swatch theme-swatch-${th.key}`} />
          <span>{t(th.labelKey)}</span>
        </button>
      ))}
    </div>
  )
}
