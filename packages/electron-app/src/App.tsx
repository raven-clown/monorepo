import { useMemo, useState } from 'react'
import { Plus, Search, Settings as SettingsIcon, SlidersHorizontal } from 'lucide-react'
import type { NewSnippetInput, Snippet } from '@snippet/core'
import { useSettings } from './hooks/useSettings'
import { useSnippets } from './hooks/useSnippets'
import { useCategories } from './hooks/useCategories'
import { useWindowWidth } from './hooks/useWindowWidth'
import { getDescendantIds } from './lib/categoryTree'
import { TitleBar } from './components/TitleBar'
import { UpdateBanner } from './components/UpdateBanner'
import { Sidebar, type FilterGroupData } from './components/Sidebar'
import { SnippetList } from './components/SnippetList'
import { DetailPane } from './components/DetailPane'
import { AddEditModal } from './components/AddEditModal'
import { SettingsModal } from './components/SettingsModal'
import { Onboarding } from './components/Onboarding'
import './App.css'

type FormState = { mode: 'add' } | { mode: 'edit'; snippet: Snippet }

function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort()
}

function App() {
  const { theme, language, onboarded, loaded, setTheme, setLanguage, finishOnboarding, t } = useSettings()
  const { snippets, add, update, remove, setPinned } = useSnippets()
  const categoriesApi = useCategories()
  const { categories } = categoriesApi
  const widthMode = useWindowWidth()

  const [languageFilter, setLanguageFilter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compactView, setCompactView] = useState<'list' | 'detail'>('list')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const languages = useMemo(() => uniqueSorted(snippets.map((s) => s.language)), [snippets])
  const tags = useMemo(() => uniqueSorted(snippets.flatMap((s) => s.tags)), [snippets])

  const categoryFilterSet = useMemo(() => {
    if (!categoryFilter) return null
    return new Set([categoryFilter, ...getDescendantIds(categories, categoryFilter)])
  }, [categories, categoryFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const result = snippets.filter((s) => {
      if (languageFilter && s.language !== languageFilter) return false
      if (categoryFilterSet && !(s.categoryId && categoryFilterSet.has(s.categoryId))) return false
      if (tagFilter && !s.tags.includes(tagFilter)) return false
      if (q && !s.title.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) return false
      return true
    })
    return [...result].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }, [snippets, languageFilter, categoryFilterSet, tagFilter, search])

  const selected = filtered.find((s) => s.id === selectedId) ?? null
  const isCompact = widthMode === 'compact'

  const languageGroup: FilterGroupData = {
    key: 'language',
    title: t('languageFilter'),
    allLabel: t('allLanguages'),
    options: languages,
    active: languageFilter,
    onSelect: setLanguageFilter,
  }

  const tagGroup: FilterGroupData = {
    key: 'tag',
    title: t('tagFilter'),
    allLabel: t('allTags'),
    options: tags,
    active: tagFilter,
    onSelect: setTagFilter,
  }

  function selectSnippet(id: string) {
    setSelectedId(id)
    setCompactView('detail')
    setDrawerOpen(false)
  }

  async function submitForm(input: NewSnippetInput) {
    if (form?.mode === 'edit') {
      await update(form.snippet.id, input)
    } else {
      await add(input)
    }
    setForm(null)
  }

  async function handleDelete(snippet: Snippet) {
    await remove(snippet.id)
    if (selectedId === snippet.id) {
      setSelectedId(null)
      setCompactView('list')
    }
  }

  async function createSnippetIn(categoryId: string) {
    const created = await add({
      title: t('untitledSnippet'),
      language: 'plaintext',
      code: '',
      categoryId,
    })
    selectSnippet(created.id)
    setForm({ mode: 'edit', snippet: created })
  }

  if (!loaded) {
    return null
  }

  if (!onboarded) {
    return <Onboarding theme={theme} setTheme={setTheme} onFinish={finishOnboarding} t={t} />
  }

  return (
    <div className="app">
      <TitleBar title={t('appTitle')} />
      <UpdateBanner t={t} />

      <div className="header">
        <div className="header-left">
          {isCompact && (
            <button className="icon-btn" onClick={() => setDrawerOpen((o) => !o)} aria-label="Filters">
              <SlidersHorizontal size={15} />
            </button>
          )}
          <div className="search-wrap">
            <Search size={13} className="search-icon" />
            <input
              className="search-input"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="primary" onClick={() => setForm({ mode: 'add' })}>
            <Plus size={14} />
            {!isCompact && t('add')}
          </button>
        </div>

        <div className="header-right">
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label={t('settings')}>
            <SettingsIcon size={15} />
          </button>
        </div>
      </div>

      <div className="content-row">
        <Sidebar
          languageGroup={languageGroup}
          tagGroup={tagGroup}
          categoryTreeProps={{
            categories,
            activeId: categoryFilter,
            onSelect: setCategoryFilter,
            onAdd: categoriesApi.add,
            onRename: categoriesApi.rename,
            onSetPinned: categoriesApi.setPinned,
            onReorder: categoriesApi.reorder,
            onMove: categoriesApi.move,
            onDelete: async (id) => {
              await categoriesApi.remove(id)
              if (categoryFilter === id) setCategoryFilter(null)
            },
            onNewSnippet: createSnippetIn,
            t,
          }}
          variant={isCompact ? 'drawer' : 'panel'}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        <div className="main-pane">
          {(!isCompact || compactView === 'list') && (
            <SnippetList
              snippets={filtered}
              categories={categories}
              selectedId={selectedId}
              onSelect={selectSnippet}
              t={t}
            />
          )}
          {(!isCompact || compactView === 'detail') && (
            <DetailPane
              key={selected?.id ?? 'none'}
              snippet={selected}
              categories={categories}
              isCompact={isCompact}
              onBack={() => setCompactView('list')}
              onTogglePin={(s) => setPinned(s.id, !s.pinned)}
              onEdit={(s) => setForm({ mode: 'edit', snippet: s })}
              onExport={(s) => window.api.data.exportSnippet(s.id)}
              onToggleHidden={(s) => update(s.id, { hiddenInVscode: !s.hiddenInVscode })}
              onDelete={handleDelete}
              t={t}
            />
          )}
        </div>
      </div>

      {form && (
        <AddEditModal
          snippet={form.mode === 'edit' ? form.snippet : null}
          categories={categories}
          onCreateCategory={(name, parentId) => categoriesApi.add({ name, parentId })}
          isCompact={isCompact}
          onClose={() => setForm(null)}
          onSubmit={submitForm}
          t={t}
        />
      )}

      {showSettings && (
        <SettingsModal
          t={t}
          theme={theme}
          setTheme={setTheme}
          language={language}
          setLanguage={setLanguage}
          isCompact={isCompact}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
