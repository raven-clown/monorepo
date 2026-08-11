import * as vscode from 'vscode';
import { getSnippets, watchStore } from '@snippet/core';
import { SnippetTreeProvider } from './snippetTreeProvider';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
	const provider = new SnippetTreeProvider();
	provider.setSnippets(getSnippets());

	const treeView = vscode.window.createTreeView('snippetManagerView', {
		treeDataProvider: provider,
	});

	registerCommands(context, provider);

	const watcher = watchStore((snippets) => {
		provider.setSnippets(snippets);
	});

	const revealActiveLanguage = (editor: vscode.TextEditor | undefined) => {
		const group = editor && provider.languageGroupItem(editor.document.languageId);
		if (group) {
			treeView.reveal(group, { expand: true, select: false, focus: false });
		}
	};
	revealActiveLanguage(vscode.window.activeTextEditor);
	const editorListener = vscode.window.onDidChangeActiveTextEditor(revealActiveLanguage);

	context.subscriptions.push(treeView, editorListener, { dispose: () => watcher.close() });
}

export function deactivate() {}
