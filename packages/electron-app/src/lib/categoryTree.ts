import type { Category } from '@snippet/core'

export interface CategoryNode extends Category {
  children: CategoryNode[]
}

export function buildTree(categories: Category[], parentId: string | null = null): CategoryNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ ...c, children: buildTree(categories, c.id) }))
}

export function getDescendantIds(categories: Category[], id: string): Set<string> {
  const result = new Set<string>()
  const children = categories.filter((c) => c.parentId === id)
  for (const child of children) {
    result.add(child.id)
    for (const grandchildId of getDescendantIds(categories, child.id)) {
      result.add(grandchildId)
    }
  }
  return result
}

export function getCategoryPath(categories: Category[], id: string | null): string {
  if (!id) return ''
  const byId = new Map(categories.map((c) => [c.id, c] as const))
  const parts: string[] = []
  let current = byId.get(id)
  while (current) {
    parts.unshift(current.name)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return parts.join(' / ')
}

export function flattenWithDepth(categories: Category[]): { category: Category; depth: number }[] {
  const result: { category: Category; depth: number }[] = []
  const visit = (nodes: CategoryNode[], depth: number) => {
    for (const node of nodes) {
      result.push({ category: node, depth })
      visit(node.children, depth + 1)
    }
  }
  visit(buildTree(categories), 0)
  return result
}
