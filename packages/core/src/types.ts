export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  useCount: number;
  lastUsedAt: string | null;
  hiddenInVscode: boolean;
}

export type NewSnippetInput = Pick<Snippet, "title" | "code" | "language"> & {
  tags?: string[];
  hiddenInVscode?: boolean;
};

export type SnippetUpdateInput = Partial<
  Pick<Snippet, "title" | "code" | "language" | "tags" | "hiddenInVscode">
>;
