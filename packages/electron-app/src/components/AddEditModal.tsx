import { useState } from 'react'
import type { Category, NewSnippetInput, Snippet } from '@snippet/core'
import type { TranslationKey } from '../i18n'
import { CategoryPicker } from './CategoryPicker'

interface Props {
  snippet: Snippet | null
  categories: Category[]
  onCreateCategory: (name: string, parentId: string | null) => Promise<Category>
  isCompact: boolean
  onClose: () => void
  onSubmit: (input: NewSnippetInput) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function AddEditModal({ snippet, categories, onCreateCategory, isCompact, onClose, onSubmit, t }: Props) {
  const [title, setTitle] = useState(snippet?.title ?? '')
  const [language, setLanguage] = useState(snippet?.language ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(snippet?.categoryId ?? null)
  const [tags, setTags] = useState(snippet?.tags.join(', ') ?? '')
  const [code, setCode] = useState(snippet?.code ?? '')
  const [hidden, setHidden] = useState(snippet?.hiddenInVscode ?? false)

  const saveDisabled = !title.trim() || !language.trim() || !code.trim()

  function submit() {
    if (saveDisabled) return
    onSubmit({
      title,
      language,
      categoryId,
      code,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      hiddenInVscode: hidden,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`glass-strong modal ${isCompact ? 'modal-drawer' : 'modal-panel'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">
          <h2 className="modal-title">{snippet ? t('edit') : t('add')}</h2>

          <div className="field">
            <label>{t('title')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>{t('language')}</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('category')}</label>
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCreate={onCreateCategory}
              t={t}
            />
          </div>
          <div className="field">
            <label>{t('tags')}</label>
            <input placeholder={t('tagsPlaceholder')} value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('code')}</label>
            <textarea className="code-input" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>

          <label className="toggle-row">
            <span className={`toggle-track ${hidden ? 'on' : ''}`}>
              <span className="toggle-thumb" />
            </span>
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="sr-only" />
            {t('hideFromVscode')}
          </label>

          <div className="modal-actions">
            <button onClick={onClose}>{t('cancel')}</button>
            <button className="primary" onClick={submit} disabled={saveDisabled}>
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
