export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  categoryId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  useCount: number;
  lastUsedAt: string | null;
  hiddenInVscode: boolean;
}

export type NewSnippetInput = Pick<Snippet, "title" | "code" | "language"> & {
  categoryId?: string | null;
  tags?: string[];
  hiddenInVscode?: boolean;
};

export type SnippetUpdateInput = Partial<
  Pick<Snippet, "title" | "code" | "language" | "categoryId" | "tags" | "hiddenInVscode">
>;

export type NewCategoryInput = {
  name: string;
  parentId?: string | null;
};

export type CategoryUpdateInput = Partial<Pick<Category, "name" | "parentId">>;

export interface StoreData {
  snippets: Snippet[];
  categories: Category[];
}

export type ImportMode = "merge" | "replace";
