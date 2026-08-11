import { useMemo, useState } from 'react'
import type { NewSnippetInput, Snippet } from '@snippet/core'
import { useSettings } from './hooks/useSettings'
import { useSnippets } from './hooks/useSnippets'
import './App.css'

type FormState =
  | { mode: 'add' }
  | { mode: 'edit'; snippet: Snippet }

const emptyForm = { title: '', language: '', tags: '', code: '', hiddenInVscode: false }

function App() {
  const { language, theme, setTheme, setLanguage, t } = useSettings()
  const { snippets, add, update, remove } = useSnippets()

  const [languageFilter, setLanguageFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [formFields, setFormFields] = useState(emptyForm)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const languages = useMemo(
    () => Array.from(new Set(snippets.map((s) => s.language))).sort(),
    [snippets]
  )
  const tags = useMemo(
    () => Array.from(new Set(snippets.flatMap((s) => s.tags))).sort(),
    [snippets]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return snippets.filter((s) => {
      if (languageFilter && s.language !== languageFilter) return false
      if (tagFilter && !s.tags.includes(tagFilter)) return false
      if (q && !s.title.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) return false
      return true
    })
  }, [snippets, languageFilter, tagFilter, search])

  const selected = filtered.find((s) => s.id === selectedId) ?? null

  function openAddForm() {
    setFormFields(emptyForm)
    setForm({ mode: 'add' })
  }

  function openEditForm(snippet: Snippet) {
    setFormFields({
      title: snippet.title,
      language: snippet.language,
      tags: snippet.tags.join(', '),
      code: snippet.code,
      hiddenInVscode: snippet.hiddenInVscode,
    })
    setForm({ mode: 'edit', snippet })
  }

  async function submitForm() {
    if (!form) return
    const tagsArray = formFields.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const input: NewSnippetInput = {
      title: formFields.title,
      language: formFields.language,
      code: formFields.code,
      tags: tagsArray,
      hiddenInVscode: formFields.hiddenInVscode,
    }
    if (form.mode === 'add') {
      await add(input)
    } else {
      await update(form.snippet.id, input)
    }
    setForm(null)
  }

  async function toggleHidden(snippet: Snippet) {
    await update(snippet.id, { hiddenInVscode: !snippet.hiddenInVscode })
  }

  async function copy(snippet: Snippet) {
    await navigator.clipboard.writeText(snippet.code)
    setCopiedId(snippet.id)
    setTimeout(() => setCopiedId((id) => (id === snippet.id ? null : id)), 1500)
  }

  async function handleDelete(snippet: Snippet) {
    if (!window.confirm(t('confirmDelete'))) return
    await remove(snippet.id)
    if (selectedId === snippet.id) setSelectedId(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('appTitle')}</h1>
        <div className="header-controls">
          <div className="toggle-group" role="group" aria-label={t('appLanguage')}>
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
              {t('languageEnglish')}
            </button>
            <button className={language === 'th' ? 'active' : ''} onClick={() => setLanguage('th')}>
              {t('languageThai')}
            </button>
          </div>
          <div className="toggle-group" role="group" aria-label={t('theme')}>
            <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
              {t('themeLight')}
            </button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
              {t('themeDark')}
            </button>
            <button className={theme === 'system' ? 'active' : ''} onClick={() => setTheme('system')}>
              {t('themeSystem')}
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <h2>{t('languageFilter')}</h2>
          <ul className="filter-list">
            <li
              className={`filter-item ${languageFilter === null ? 'active' : ''}`}
              onClick={() => setLanguageFilter(null)}
            >
              <span>{t('allLanguages')}</span>
            </li>
            {languages.map((lang) => (
              <li
                key={lang}
                className={`filter-item ${languageFilter === lang ? 'active' : ''}`}
                onClick={() => setLanguageFilter(lang)}
              >
                <span>{lang}</span>
              </li>
            ))}
          </ul>

          <h2>{t('tagFilter')}</h2>
          <ul className="filter-list">
            <li className={`filter-item ${tagFilter === null ? 'active' : ''}`} onClick={() => setTagFilter(null)}>
              <span>{t('allTags')}</span>
            </li>
            {tags.map((tag) => (
              <li
                key={tag}
                className={`filter-item ${tagFilter === tag ? 'active' : ''}`}
                onClick={() => setTagFilter(tag)}
              >
                <span>{tag}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="main-pane">
          <div className="list-pane">
            <div className="list-toolbar">
              <input
                type="search"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="primary" onClick={openAddForm}>
                {t('add')}
              </button>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state">{t('noSnippets')}</div>
            ) : (
              <ul className="snippet-list">
                {filtered.map((snippet) => (
                  <li
                    key={snippet.id}
                    className={`snippet-row ${snippet.id === selectedId ? 'selected' : ''}`}
                    onClick={() => setSelectedId(snippet.id)}
                  >
                    <div className="snippet-row-title">{snippet.title}</div>
                    <div className="snippet-row-meta">
                      {snippet.language}
                      {snippet.tags.length ? ` · ${snippet.tags.join(', ')}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="detail-pane">
            {selected ? (
              <>
                <div className="detail-header">
                  <div>
                    <h2>{selected.title}</h2>
                    <div className="detail-meta">
                      <span className="tag-chip">{selected.language}</span>
                      {selected.tags.map((tag) => (
                        <span className="tag-chip" key={tag}>
                          {tag}
                        </span>
                      ))}
                      {selected.hiddenInVscode && <span className="tag-chip">{t('hiddenBadge')}</span>}
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button onClick={() => toggleHidden(selected)}>
                      {selected.hiddenInVscode ? t('showInVscode') : t('hideFromVscode')}
                    </button>
                    <button onClick={() => openEditForm(selected)}>{t('edit')}</button>
                    <button onClick={() => handleDelete(selected)}>{t('delete')}</button>
                    <button className="primary" onClick={() => copy(selected)}>
                      {copiedId === selected.id ? t('copied') : t('copy')}
                    </button>
                  </div>
                </div>
                <pre className="code-block">
                  <code>{selected.code}</code>
                </pre>
              </>
            ) : (
              <div className="empty-state">{t('selectSnippet')}</div>
            )}
          </div>
        </div>
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.mode === 'add' ? t('add') : t('edit')}</h2>
            <div className="field">
              <label>{t('title')}</label>
              <input
                value={formFields.title}
                onChange={(e) => setFormFields((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('language')}</label>
              <input
                value={formFields.language}
                onChange={(e) => setFormFields((f) => ({ ...f, language: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('tags')}</label>
              <input
                placeholder={t('tagsPlaceholder')}
                value={formFields.tags}
                onChange={(e) => setFormFields((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('code')}</label>
              <textarea
                value={formFields.code}
                onChange={(e) => setFormFields((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={formFields.hiddenInVscode}
                onChange={(e) => setFormFields((f) => ({ ...f, hiddenInVscode: e.target.checked }))}
              />
              {t('hideFromVscode')}
            </label>
            <div className="modal-actions">
              <button onClick={() => setForm(null)}>{t('cancel')}</button>
              <button
                className="primary"
                onClick={submitForm}
                disabled={!formFields.title || !formFields.language || !formFields.code}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
