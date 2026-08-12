import { LayoutGrid, RefreshCw, HardDrive } from 'lucide-react'
import type { TranslationKey } from '../i18n'
import type { Theme } from '../hooks/useSettings'
import { ThemeSwatches } from './ThemeSwatches'

interface Props {
  theme: Theme
  setTheme: (theme: Theme) => void
  onFinish: () => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function Onboarding({ theme, setTheme, onFinish, t }: Props) {
  const highlights = [
    { icon: LayoutGrid, title: t('highlight1Title'), body: t('highlight1Body') },
    { icon: RefreshCw, title: t('highlight2Title'), body: t('highlight2Body') },
    { icon: HardDrive, title: t('highlight3Title'), body: t('highlight3Body') },
  ]

  return (
    <div className="fullbleed">
      <div className="onboard-wrap">
        <span className="brand-mark-lg">
          <img src="/icon.png" alt="" width={40} height={40} />
        </span>
        <h1 className="hero-title">{t('heroTitle')}</h1>
        <p className="hero-sub">{t('heroSubtitle')}</p>

        <div className="highlight-row">
          {highlights.map((h) => (
            <div className="highlight-card glass" key={h.title}>
              <h.icon size={20} />
              <div className="onboard-card-title">{h.title}</div>
              <div className="onboard-card-body">{h.body}</div>
            </div>
          ))}
        </div>

        <div className="onboard-section">
          <div className="onboard-section-label">{t('chooseLook')}</div>
          <ThemeSwatches value={theme} onChange={setTheme} t={t} />
        </div>

        <button className="continue-btn primary" onClick={onFinish}>
          {t('continueBtn')}
        </button>
      </div>
    </div>
  )
}
