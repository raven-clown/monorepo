import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Diamond, FileText, Folder, FolderOpen, Plus } from 'lucide-react'
import type { Category, NewCategoryInput, Snippet } from '@snippet/core'
import type { TranslationKey } from '../i18n'
import { buildTree, type CategoryNode } from '../lib/categoryTree'

interface CategoryMenuState {
  type: 'category'
  id: string
  x: number
  y: number
}
interface SnippetMenuState {
  type: 'snippet'
  id: string
  x: number
  y: number
}
type MenuState = CategoryMenuState | SnippetMenuState

type DropPosition = 'before' | 'after' | 'into'
interface DropTarget {
  id: string | 'root'
  position: DropPosition
}
type DragItem = { type: 'category' | 'snippet'; id: string }

interface Props {
  categories: Category[]
  snippets: Snippet[]
  activeId: string | null
  activeSnippetId: string | null
  onSelect: (id: string | null) => void
  onSelectSnippet: (id: string) => void
  onAdd: (input: NewCategoryInput) => Promise<Category>
  onRename: (id: string, name: string) => Promise<void>
  onSetPinned: (id: string, pinned: boolean) => Promise<void>
  onReorder: (id: string, direction: 'up' | 'down') => Promise<void>
  onMove: (id: string, parentId: string | null, index?: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCreateSnippet: (categoryId: string | null) => Promise<Snippet>
  onRenameSnippet: (id: string, title: string) => Promise<void>
  onMoveSnippet: (id: string, categoryId: string | null) => Promise<void>
  onEditSnippet: (id: string) => void
  onDeleteSnippet: (id: string) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function CategoryTree({
  categories,
  snippets,
  activeId,
  activeSnippetId,
  onSelect,
  onSelectSnippet,
  onAdd,
  onRename,
  onSetPinned,
  onReorder,
  onMove,
  onDelete,
  onCreateSnippet,
  onRenameSnippet,
  onMoveSnippet,
  onEditSnippet,
  onDeleteSnippet,
  t,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null)
  const [renamingSnippetId, setRenamingSnippetId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined)
  const [createValue, setCreateValue] = useState('')
  const [dragItem, setDragItem] = useState<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<
    { type: 'category'; id: string; name: string } | { type: 'snippet'; id: string } | null
  >(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onClickAway = () => setMenu(null)
    document.addEventListener('click', onClickAway)
    return () => document.removeEventListener('click', onClickAway)
  }, [menu])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function startRenameCategory(category: Category) {
    setMenu(null)
    setRenamingCategoryId(category.id)
    setRenameValue(category.name)
  }

  async function commitRenameCategory() {
    if (renamingCategoryId && renameValue.trim()) {
      await onRename(renamingCategoryId, renameValue.trim())
    }
    setRenamingCategoryId(null)
  }

  function startRenameSnippet(snippet: Snippet) {
    setMenu(null)
    setRenamingSnippetId(snippet.id)
    setRenameValue(snippet.title)
  }

  async function commitRenameSnippet() {
    if (renamingSnippetId && renameValue.trim()) {
      await onRenameSnippet(renamingSnippetId, renameValue.trim())
    }
    setRenamingSnippetId(null)
  }

  function startCreate(parentId: string | null) {
    setMenu(null)
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId))
    setCreatingParentId(parentId)
    setCreateValue('')
  }

  async function commitCreate() {
    if (createValue.trim()) {
      const created = await onAdd({ name: createValue.trim(), parentId: creatingParentId ?? null })
      onSelect(created.id)
    }
    setCreatingParentId(undefined)
  }

  async function createSnippet(categoryId: string | null) {
    setMenu(null)
    if (categoryId) setExpanded((prev) => new Set(prev).add(categoryId))
    const created = await onCreateSnippet(categoryId)
    onSelectSnippet(created.id)
    setRenamingSnippetId(created.id)
    setRenameValue(created.title)
  }

  function handleDragOver(e: React.DragEvent, target: DropTarget) {
    if (!dragItem) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(target)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dragged = dragItem
    const target = dropTarget
    setDragItem(null)
    setDropTarget(null)
    if (!dragged || !target) return
    if (dragged.id === target.id) return

    if (dragged.type === 'snippet') {
      const categoryId = target.id === 'root' ? null : target.id
      await onMoveSnippet(dragged.id, categoryId)
      return
    }

    const byId = new Map(categories.map((c) => [c.id, c] as const))
    try {
      if (target.position === 'into') {
        const parentId = target.id === 'root' ? null : target.id
        await onMove(dragged.id, parentId)
      } else {
        const anchor = target.id === 'root' ? null : byId.get(target.id) ?? null
        const parentId = anchor ? anchor.parentId : null
        const siblingOrder = anchor ? anchor.order : 0
        const index = target.position === 'after' ? siblingOrder + 1 : siblingOrder
        await onMove(dragged.id, parentId, index)
      }
    } catch {
      // ignore invalid moves (e.g. dropping a folder into its own descendant)
    }
  }

  const pinnedCategories = categories.filter((c) => c.pinned)
  const tree = buildTree(categories)
  const uncategorized = snippets.filter((s) => s.categoryId === null)

  function renderSnippetLeaf(snippet: Snippet, depth: number) {
    const isRenaming = renamingSnippetId === snippet.id
    const isDragging = dragItem?.type === 'snippet' && dragItem.id === snippet.id

    return (
      <div key={snippet.id}>
        <div
          className={`tree-row ${isDragging ? 'dragging' : ''}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ type: 'snippet', id: snippet.id, x: e.clientX, y: e.clientY })
          }}
        >
          <span className="tree-disclosure" style={{ visibility: 'hidden' }} />
          {isRenaming ? (
            <input
              className="tree-rename-input"
              value={renameValue}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRenameSnippet}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRenameSnippet()
                if (e.key === 'Escape') setRenamingSnippetId(null)
              }}
            />
          ) : (
            <button
              className={`filter-item tree-label ${activeSnippetId === snippet.id ? 'active' : ''}`}
              draggable
              onDragStart={() => setDragItem({ type: 'snippet', id: snippet.id })}
              onDragEnd={() => {
                setDragItem(null)
                setDropTarget(null)
              }}
              onClick={() => onSelectSnippet(snippet.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ type: 'snippet', id: snippet.id, x: e.clientX, y: e.clientY })
              }}
            >
              <FileText size={13} />
              <span className="tree-label-text">{snippet.title}</span>
              {snippet.pinned && <Diamond size={8} className="pin-dot" fill="currentColor" />}
            </button>
          )}
        </div>
      </div>
    )
  }

  function renderNode(node: CategoryNode, depth: number) {
    const isExpanded = expanded.has(node.id)
    const nodeSnippets = snippets.filter((s) => s.categoryId === node.id)
    const hasChildren = node.children.length > 0 || nodeSnippets.length > 0
    const isRenaming = renamingCategoryId === node.id
    const isDragging = dragItem?.type === 'category' && dragItem.id === node.id
    const dropHere = dropTarget?.id === node.id ? dropTarget.position : null

    return (
      <div key={node.id}>
        <div
          className={`tree-row ${dropHere ? `drop-${dropHere}` : ''} ${isDragging ? 'dragging' : ''}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ type: 'category', id: node.id, x: e.clientX, y: e.clientY })
          }}
          onDragOver={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientY - rect.top) / rect.height
            const position: DropPosition = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'into'
            handleDragOver(e, { id: node.id, position: dragItem?.type === 'snippet' ? 'into' : position })
          }}
          onDragLeave={() => setDropTarget((t) => (t?.id === node.id ? null : t))}
          onDrop={handleDrop}
        >
          <button
            className="tree-disclosure"
            onClick={() => (hasChildren ? toggle(node.id) : undefined)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>

          {isRenaming ? (
            <input
              className="tree-rename-input"
              value={renameValue}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRenameCategory}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRenameCategory()
                if (e.key === 'Escape') setRenamingCategoryId(null)
              }}
            />
          ) : (
            <button
              className={`filter-item tree-label ${activeId === node.id ? 'active' : ''}`}
              draggable
              onDragStart={() => setDragItem({ type: 'category', id: node.id })}
              onDragEnd={() => {
                setDragItem(null)
                setDropTarget(null)
              }}
              onClick={() => onSelect(node.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ type: 'category', id: node.id, x: e.clientX, y: e.clientY })
              }}
            >
              {isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}
              <span className="tree-label-text">{node.name}</span>
              {node.pinned && <Diamond size={8} className="pin-dot" fill="currentColor" />}
            </button>
          )}
        </div>

        {creatingParentId === node.id && (
          <div className="tree-row" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
            <span className="tree-disclosure" style={{ visibility: 'hidden' }} />
            <input
              className="tree-rename-input"
              placeholder={t('newCategoryPlaceholder')}
              value={createValue}
              autoFocus
              onChange={(e) => setCreateValue(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate()
                if (e.key === 'Escape') setCreatingParentId(undefined)
              }}
            />
          </div>
        )}

        {isExpanded && (
          <>
            {node.children.map((child) => renderNode(child, depth + 1))}
            {nodeSnippets.map((s) => renderSnippetLeaf(s, depth + 1))}
          </>
        )}
      </div>
    )
  }

  const menuCategory = menu?.type === 'category' ? categories.find((c) => c.id === menu.id) : null
  const menuSnippet = menu?.type === 'snippet' ? snippets.find((s) => s.id === menu.id) : null
  const rootDrop = dropTarget?.id === 'root'

  return (
    <div className="category-tree">
      {pinnedCategories.length > 0 && (
        <div className="filter-group">
          <div className="filter-group-header static">
            <span className="filter-group-title">{t('pinned')}</span>
          </div>
          <div className="filter-list">
            {pinnedCategories.map((c) => (
              <button
                key={c.id}
                className={`filter-item ${activeId === c.id ? 'active' : ''}`}
                onClick={() => onSelect(c.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenu({ type: 'category', id: c.id, x: e.clientX, y: e.clientY })
                }}
              >
                <Diamond size={9} fill="currentColor" className="pin-dot" />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-group">
        <div className="filter-group-header static">
          <span className="filter-group-title">{t('categoryFilter')}</span>
          <span className="filter-group-count">({categories.length})</span>
          <button className="icon-btn tree-add-btn" onClick={() => startCreate(null)} aria-label={t('newCategory')}>
            <Plus size={13} />
          </button>
        </div>
        <div className="filter-list">
          <button
            className={`filter-item ${activeId === null ? 'active' : ''} ${rootDrop ? 'drop-into' : ''}`}
            onClick={() => onSelect(null)}
            onDragOver={(e) => handleDragOver(e, { id: 'root', position: 'into' })}
            onDragLeave={() => setDropTarget((t) => (t?.id === 'root' ? null : t))}
            onDrop={handleDrop}
          >
            {t('allCategories')}
          </button>
          {tree.map((node) => renderNode(node, 0))}
          {creatingParentId === null && (
            <div className="tree-row" style={{ paddingLeft: 8 }}>
              <span className="tree-disclosure" style={{ visibility: 'hidden' }} />
              <input
                className="tree-rename-input"
                placeholder={t('newCategoryPlaceholder')}
                value={createValue}
                autoFocus
                onChange={(e) => setCreateValue(e.target.value)}
                onBlur={commitCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCreate()
                  if (e.key === 'Escape') setCreatingParentId(undefined)
                }}
              />
            </div>
          )}
          {uncategorized.map((s) => renderSnippetLeaf(s, 1))}
        </div>
      </div>

      {menu && menuCategory && (
        <div
          ref={menuRef}
          className="action-menu glass-strong tree-context-menu"
          style={{ position: 'fixed', top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="menu-item" onClick={() => createSnippet(menuCategory.id)}>
            {t('newSnippetHere')}
          </button>
          <button className="menu-item" onClick={() => startCreate(menuCategory.id)}>
            {t('newSubcategory')}
          </button>
          <button className="menu-item" onClick={() => startRenameCategory(menuCategory)}>
            {t('rename')}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onSetPinned(menuCategory.id, !menuCategory.pinned)
            }}
          >
            {menuCategory.pinned ? t('unpinCategory') : t('pinCategory')}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onReorder(menuCategory.id, 'up')
            }}
          >
            {t('moveUp')}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onReorder(menuCategory.id, 'down')
            }}
          >
            {t('moveDown')}
          </button>
          <button
            className="menu-item menu-item-danger"
            onClick={() => {
              setMenu(null)
              setConfirmTarget({ type: 'category', id: menuCategory.id, name: menuCategory.name })
            }}
          >
            {t('delete')}
          </button>
        </div>
      )}

      {menu && menuSnippet && (
        <div
          ref={menuRef}
          className="action-menu glass-strong tree-context-menu"
          style={{ position: 'fixed', top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="menu-item" onClick={() => startRenameSnippet(menuSnippet)}>
            {t('rename')}
          </button>
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onEditSnippet(menuSnippet.id)
            }}
          >
            {t('edit')}
          </button>
          <button
            className="menu-item menu-item-danger"
            onClick={() => {
              setMenu(null)
              setConfirmTarget({ type: 'snippet', id: menuSnippet.id })
            }}
          >
            {t('delete')}
          </button>
        </div>
      )}

      {confirmTarget && (
        <div className="modal-backdrop" onClick={() => setConfirmTarget(null)}>
          <div className="glass-strong modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <h2 className="modal-title">
                {confirmTarget.type === 'category'
                  ? t('confirmDeleteCategory', { name: confirmTarget.name })
                  : t('confirmDelete')}
              </h2>
              <div className="modal-actions">
                <button onClick={() => setConfirmTarget(null)}>{t('no')}</button>
                <button
                  className="danger"
                  onClick={() => {
                    if (confirmTarget.type === 'category') onDelete(confirmTarget.id)
                    else onDeleteSnippet(confirmTarget.id)
                    setConfirmTarget(null)
                  }}
                >
                  {t('yes')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
