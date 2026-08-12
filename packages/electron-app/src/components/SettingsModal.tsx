import { useState } from 'react'
import type { ImportMode, StoreData } from '@snippet/core'
import { useDataLocation } from '../hooks/useDataLocation'
import type { TranslationKey } from '../i18n'
import type { Language } from '../i18n'
import type { Theme } from '../hooks/useSettings'
import { ThemeSwatches } from './ThemeSwatches'

type PendingImport = { kind: 'store'; payload: Partial<StoreData>; count: number } | { kind: 'snippets'; payload: unknown[]; count: number }

interface Props {
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  theme: Theme
  setTheme: (theme: Theme) => void
  language: Language
  setLanguage: (language: Language) => void
  isCompact: boolean
  onClose: () => void
}

export function SettingsModal({ t, theme, setTheme, language, setLanguage, isCompact, onClose }: Props) {
  const { location, pick, reset } = useDataLocation()
  const [message, setMessage] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [checking, setChecking] = useState(false)

  async function handleExportAll() {
    const path = await window.api.data.exportAll()
    if (path) setMessage(t('exportSuccess', { path }))
  }

  async function handleImportPick() {
    const result = await window.api.data.pickImportFile()
    if (!result) return
    if ('error' in result) {
      setMessage(t('importError'))
      return
    }
    setPendingImport({ kind: result.kind, payload: result.payload, count: result.count } as PendingImport)
  }

  async function handleImportConfirm(mode: ImportMode) {
    if (!pendingImport) return
    const count =
      pendingImport.kind === 'store'
        ? (await window.api.data.importStore(pendingImport.payload, mode)).snippets.length
        : (await window.api.data.importSnippets(pendingImport.payload, mode)).length
    setPendingImport(null)
    setMessage(t('importSuccess', { count }))
  }

  async function handleCheckUpdates() {
    setChecking(true)
    await window.api.updates.check()
    setTimeout(() => setChecking(false), 1200)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`glass-strong modal ${isCompact ? 'modal-drawer' : 'modal-panel'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">{t('settings')}</h2>

        <div className="settings-section">
          <label className="settings-label">{t('theme')}</label>
          <ThemeSwatches value={theme} onChange={setTheme} t={t} />
        </div>

        <div className="settings-section">
          <label className="settings-label">{t('appLanguage')}</label>
          <div className="lang-switch-wrap">
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
              {t('languageEnglish')}
            </button>
            <button className={language === 'th' ? 'active' : ''} onClick={() => setLanguage('th')}>
              {t('languageThai')}
            </button>
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-label">{t('dataLocation')}</label>
          <div className="settings-row">
            <code className="settings-path">{location?.path ?? '…'}</code>
            <button onClick={() => pick()}>{t('changeLocation')}</button>
          </div>
          {location?.isCustom && (
            <button className="link-btn" onClick={() => reset()}>
              {t('resetToDefault')}
            </button>
          )}
        </div>

        <div className="settings-section">
          <label className="settings-label">{t('dataBackup')}</label>
          <div className="settings-row">
            <button onClick={handleExportAll}>{t('exportAll')}</button>
            <button onClick={handleImportPick}>{t('importSnippets')}</button>
          </div>
          {pendingImport && (
            <div className="import-confirm">
              <div className="settings-hint">
                {t('importConfirmTitle', { count: pendingImport.count })} — {t('importConfirmBody')}
              </div>
              <div className="settings-row">
                <button className="primary" onClick={() => handleImportConfirm('merge')}>
                  {t('importMerge')}
                </button>
                <button onClick={() => handleImportConfirm('replace')}>{t('importReplace')}</button>
                <button onClick={() => setPendingImport(null)}>{t('cancel')}</button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-section">
          <label className="settings-label">{t('checkUpdates')}</label>
          <button onClick={handleCheckUpdates} disabled={checking}>
            {checking ? t('updateChecking') : t('checkUpdates')}
          </button>
        </div>

        {message && <div className="settings-message">{message}</div>}

        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
