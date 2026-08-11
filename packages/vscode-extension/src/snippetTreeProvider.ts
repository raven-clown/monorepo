import * as vscode from 'vscode';
import { Snippet } from '@snippet/core';

export class PinnedGroupItem extends vscode.TreeItem {
	constructor(count: number) {
		super('Pinned', vscode.TreeItemCollapsibleState.Expanded);
		this.id = 'group:pinned';
		this.contextValue = 'pinnedGroup';
		this.description = `${count}`;
		this.iconPath = new vscode.ThemeIcon('pinned');
	}
}

export class LanguageGroupItem extends vscode.TreeItem {
	constructor(public readonly language: string, count: number) {
		super(language, vscode.TreeItemCollapsibleState.Expanded);
		this.id = `group:${language}`;
		this.contextValue = 'languageGroup';
		this.description = `${count}`;
		this.iconPath = new vscode.ThemeIcon('symbol-color');
	}
}

export class SnippetItem extends vscode.TreeItem {
	constructor(public readonly snippet: Snippet) {
		super(snippet.title, vscode.TreeItemCollapsibleState.None);
		this.id = `snippet:${snippet.id}`;
		this.contextValue = snippet.pinned ? 'snippet-pinned' : 'snippet-unpinned';
		const meta = [...snippet.tags];
		if (snippet.useCount > 0) {
			meta.push(`used ${snippet.useCount}x`);
		}
		this.description = meta.length ? meta.join(' · ') : undefined;
		this.tooltip = new vscode.MarkdownString(
			`**${snippet.title}**\n\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``
		);
		this.iconPath = new vscode.ThemeIcon(snippet.pinned ? 'pinned' : 'symbol-snippet');
		this.command = {
			command: 'snippet-manager.activateSnippet',
			title: 'Open Snippet',
			arguments: [this],
		};
	}
}

type SnippetGroupNode = PinnedGroupItem | LanguageGroupItem;
type SnippetTreeNode = SnippetGroupNode | SnippetItem;

function sortByUsage(snippets: Snippet[]): Snippet[] {
	return [...snippets].sort((a, b) => b.useCount - a.useCount || a.title.localeCompare(b.title));
}

export class SnippetTreeProvider implements vscode.TreeDataProvider<SnippetTreeNode> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private snippets: Snippet[] = [];

	setSnippets(snippets: Snippet[]): void {
		this.snippets = snippets.filter((s) => !s.hiddenInVscode);
		this._onDidChangeTreeData.fire();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	languages(): string[] {
		return Array.from(new Set(this.snippets.map((s) => s.language))).sort();
	}

	languageGroupItem(language: string): LanguageGroupItem | undefined {
		const count = this.snippets.filter((s) => s.language === language).length;
		return count > 0 ? new LanguageGroupItem(language, count) : undefined;
	}

	getTreeItem(element: SnippetTreeNode): vscode.TreeItem {
		return element;
	}

	getChildren(element?: SnippetTreeNode): SnippetTreeNode[] {
		if (!element) {
			const nodes: SnippetTreeNode[] = [];
			const pinned = this.snippets.filter((s) => s.pinned);
			if (pinned.length) {
				nodes.push(new PinnedGroupItem(pinned.length));
			}
			nodes.push(...this.languages().map((language) => this.languageGroupItem(language)!));
			return nodes;
		}

		if (element instanceof PinnedGroupItem) {
			return sortByUsage(this.snippets.filter((s) => s.pinned)).map((s) => new SnippetItem(s));
		}

		if (element instanceof LanguageGroupItem) {
			return sortByUsage(this.snippets.filter((s) => !s.pinned && s.language === element.language)).map(
				(s) => new SnippetItem(s)
			);
		}

		return [];
	}
}
