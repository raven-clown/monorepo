import { useState } from 'react'
import type { ImportMode } from '@snippet/core'
import { useDataLocation } from '../hooks/useDataLocation'
import type { TranslationKey } from '../i18n'

interface Props {
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  onClose: () => void
}

export function SettingsModal({ t, onClose }: Props) {
  const { location, pick, reset } = useDataLocation()
  const [message, setMessage] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<{ snippets: unknown[]; count: number } | null>(null)

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
    setPendingImport({ snippets: result.snippets, count: result.count })
  }

  async function handleImportConfirm(mode: ImportMode) {
    if (!pendingImport) return
    const merged = await window.api.data.import(pendingImport.snippets, mode)
    setPendingImport(null)
    setMessage(t('importSuccess', { count: merged.length }))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('settings')}</h2>

        <div className="settings-section">
          <label>{t('dataLocation')}</label>
          <div className="settings-row">
            <code className="settings-path">{location?.path ?? '…'}</code>
            {location?.isCustom && <span className="tag-chip">{t('customLocationBadge')}</span>}
          </div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button onClick={() => pick()}>{t('changeLocation')}</button>
            {location?.isCustom && <button onClick={() => reset()}>{t('resetToDefault')}</button>}
          </div>
        </div>

        <div className="settings-section">
          <label>{t('dataBackup')}</label>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button onClick={handleExportAll}>{t('exportAll')}</button>
            <button onClick={handleImportPick}>{t('importSnippets')}</button>
          </div>
        </div>

        {message && <div className="settings-message">{message}</div>}

        {pendingImport && (
          <div className="settings-section">
            <label>{t('importConfirmTitle', { count: pendingImport.count })}</label>
            <p className="settings-hint">{t('importConfirmBody')}</p>
            <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
              <button onClick={() => handleImportConfirm('merge')}>{t('importMerge')}</button>
              <button onClick={() => handleImportConfirm('replace')}>{t('importReplace')}</button>
              <button onClick={() => setPendingImport(null)}>{t('cancel')}</button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
