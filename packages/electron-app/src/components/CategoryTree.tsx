import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Diamond, Folder, FolderOpen, Plus } from 'lucide-react'
import type { Category, NewCategoryInput } from '@snippet/core'
import type { TranslationKey } from '../i18n'
import { buildTree, type CategoryNode } from '../lib/categoryTree'

interface ContextMenuState {
  id: string
  x: number
  y: number
}

type DropPosition = 'before' | 'after' | 'into'
interface DropTarget {
  id: string | 'root'
  position: DropPosition
}

interface Props {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string | null) => void
  onAdd: (input: NewCategoryInput) => Promise<Category>
  onRename: (id: string, name: string) => Promise<void>
  onSetPinned: (id: string, pinned: boolean) => Promise<void>
  onReorder: (id: string, direction: 'up' | 'down') => Promise<void>
  onMove: (id: string, parentId: string | null, index?: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onNewSnippet: (categoryId: string) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

export function CategoryTree({
  categories,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onSetPinned,
  onReorder,
  onMove,
  onDelete,
  onNewSnippet,
  t,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined)
  const [createValue, setCreateValue] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
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

  function startRename(category: Category) {
    setMenu(null)
    setRenamingId(category.id)
    setRenameValue(category.name)
  }

  async function commitRename() {
    if (renamingId && renameValue.trim()) {
      await onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
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

  function handleDragOver(e: React.DragEvent, target: DropTarget) {
    if (!dragId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(target)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const draggedId = dragId
    const target = dropTarget
    setDragId(null)
    setDropTarget(null)
    if (!draggedId || !target) return
    if (draggedId === target.id) return

    const byId = new Map(categories.map((c) => [c.id, c] as const))
    try {
      if (target.position === 'into') {
        const parentId = target.id === 'root' ? null : target.id
        await onMove(draggedId, parentId)
      } else {
        const anchor = target.id === 'root' ? null : byId.get(target.id) ?? null
        const parentId = anchor ? anchor.parentId : null
        const siblingOrder = anchor ? anchor.order : 0
        const index = target.position === 'after' ? siblingOrder + 1 : siblingOrder
        await onMove(draggedId, parentId, index)
      }
    } catch {
      // ignore invalid moves (e.g. dropping a folder into its own descendant)
    }
  }

  const pinned = categories.filter((c) => c.pinned)
  const tree = buildTree(categories)

  function renderNode(node: CategoryNode, depth: number) {
    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const isRenaming = renamingId === node.id
    const isDragging = dragId === node.id
    const dropHere = dropTarget?.id === node.id ? dropTarget.position : null

    return (
      <div key={node.id}>
        <div
          className={`tree-row ${dropHere ? `drop-${dropHere}` : ''} ${isDragging ? 'dragging' : ''}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ id: node.id, x: e.clientX, y: e.clientY })
          }}
          onDragOver={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientY - rect.top) / rect.height
            const position: DropPosition = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'into'
            handleDragOver(e, { id: node.id, position })
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
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setRenamingId(null)
              }}
            />
          ) : (
            <button
              className={`filter-item tree-label ${activeId === node.id ? 'active' : ''}`}
              draggable
              onDragStart={() => setDragId(node.id)}
              onDragEnd={() => {
                setDragId(null)
                setDropTarget(null)
              }}
              onClick={() => onSelect(node.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ id: node.id, x: e.clientX, y: e.clientY })
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

        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  const menuCategory = menu ? categories.find((c) => c.id === menu.id) : null
  const rootDrop = dropTarget?.id === 'root'

  return (
    <div className="category-tree">
      {pinned.length > 0 && (
        <div className="filter-group">
          <div className="filter-group-header static">
            <span className="filter-group-title">{t('pinned')}</span>
          </div>
          <div className="filter-list">
            {pinned.map((c) => (
              <button
                key={c.id}
                className={`filter-item ${activeId === c.id ? 'active' : ''}`}
                onClick={() => onSelect(c.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenu({ id: c.id, x: e.clientX, y: e.clientY })
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
        </div>
      </div>

      {menu && menuCategory && (
        <div
          ref={menuRef}
          className="action-menu glass-strong tree-context-menu"
          style={{ position: 'fixed', top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="menu-item"
            onClick={() => {
              setMenu(null)
              onNewSnippet(menuCategory.id)
            }}
          >
            {t('newSnippetHere')}
          </button>
          <button className="menu-item" onClick={() => startCreate(menuCategory.id)}>
            {t('newSubcategory')}
          </button>
          <button className="menu-item" onClick={() => startRename(menuCategory)}>
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
              if (window.confirm(t('confirmDeleteCategory', { name: menuCategory.name }))) {
                onDelete(menuCategory.id)
              }
            }}
          >
            {t('delete')}
          </button>
        </div>
      )}
    </div>
  )
}
