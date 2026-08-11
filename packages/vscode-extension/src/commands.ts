import * as vscode from 'vscode';
import {
	addSnippet,
	deleteSnippet,
	getSnippets,
	recordUsage,
	setPinned,
	type Snippet,
} from '@snippet/core';
import { SnippetItem, SnippetTreeProvider } from './snippetTreeProvider';

type ClickAction = 'copy' | 'insert' | 'open';

function getClickAction(): ClickAction {
	return vscode.workspace.getConfiguration('snippetManager').get<ClickAction>('clickAction', 'copy');
}

async function copyToClipboard(snippet: Snippet) {
	await vscode.env.clipboard.writeText(snippet.code);
	vscode.window.showInformationMessage(`Copied "${snippet.title}" to clipboard.`);
}

async function insertAtCursor(snippet: Snippet) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('Open a file first to insert a snippet.');
		return;
	}
	await editor.edit((editBuilder) => editBuilder.insert(editor.selection.active, snippet.code));
}

async function openInNewEditor(snippet: Snippet) {
	const doc = await vscode.workspace.openTextDocument({ content: snippet.code, language: snippet.language });
	await vscode.window.showTextDocument(doc, { preview: false });
}

async function promptSnippetFields(defaults: { title?: string; language?: string; tags?: string } = {}) {
	const title = await vscode.window.showInputBox({
		prompt: 'Snippet title',
		placeHolder: 'e.g. Debounce function',
		value: defaults.title,
	});
	if (!title) {
		return undefined;
	}

	const language = await vscode.window.showInputBox({
		prompt: 'Language',
		value: defaults.language,
	});
	if (!language) {
		return undefined;
	}

	const tagsInput = await vscode.window.showInputBox({
		prompt: 'Tags (comma separated, optional)',
		placeHolder: 'utility, debounce',
		value: defaults.tags,
	});
	const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [];

	return { title, language, tags };
}

export function registerCommands(
	context: vscode.ExtensionContext,
	provider: SnippetTreeProvider
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('snippet-manager.refresh', () => {
			provider.setSnippets(getSnippets());
		}),

		vscode.commands.registerCommand('snippet-manager.addSnippet', async () => {
			const editor = vscode.window.activeTextEditor;
			const selection = editor && !editor.selection.isEmpty ? editor.document.getText(editor.selection) : undefined;

			if (!selection) {
				vscode.window.showErrorMessage(
					'Select some code in the editor first, then run "Add Snippet". Use "Add Snippet (Blank)" if you have nothing to select yet.'
				);
				return;
			}

			const fields = await promptSnippetFields({ language: editor!.document.languageId });
			if (!fields) {
				return;
			}

			addSnippet({ ...fields, code: selection });
			provider.setSnippets(getSnippets());
			vscode.window.showInformationMessage(`Snippet "${fields.title}" added.`);
		}),

		vscode.commands.registerCommand('snippet-manager.addSnippetBlank', async () => {
			const language = await vscode.window.showInputBox({
				prompt: 'Language for the new snippet',
				value: vscode.window.activeTextEditor?.document.languageId ?? 'plaintext',
			});
			if (!language) {
				return;
			}

			const doc = await vscode.workspace.openTextDocument({ content: '', language });
			await vscode.window.showTextDocument(doc, { preview: false });
			vscode.window.showInformationMessage(
				'Write your snippet, then run "Snippet Manager: Save As Snippet" when ready.'
			);
		}),

		vscode.commands.registerCommand('snippet-manager.saveAsSnippet', async () => {
			const editor = vscode.window.activeTextEditor;
			const code = editor?.document.getText();
			if (!editor || !code?.trim()) {
				vscode.window.showErrorMessage('Open a file with some content first.');
				return;
			}

			const fields = await promptSnippetFields({ language: editor.document.languageId });
			if (!fields) {
				return;
			}

			addSnippet({ ...fields, code });
			provider.setSnippets(getSnippets());
			vscode.window.showInformationMessage(`Snippet "${fields.title}" added.`);
		}),

		vscode.commands.registerCommand('snippet-manager.activateSnippet', async (item?: SnippetItem) => {
			const snippet = item?.snippet;
			if (!snippet) {
				return;
			}
			const action = getClickAction();
			if (action === 'insert') {
				await insertAtCursor(snippet);
			} else if (action === 'open') {
				await openInNewEditor(snippet);
			} else {
				await copyToClipboard(snippet);
			}
			recordUsage(snippet.id);
			provider.setSnippets(getSnippets());
		}),

		vscode.commands.registerCommand('snippet-manager.copySnippet', async (item?: SnippetItem) => {
			const snippet = item?.snippet;
			if (!snippet) {
				return;
			}
			await copyToClipboard(snippet);
			recordUsage(snippet.id);
			provider.setSnippets(getSnippets());
		}),

		vscode.commands.registerCommand('snippet-manager.pinSnippet', (item?: SnippetItem) => {
			if (!item?.snippet) {
				return;
			}
			setPinned(item.snippet.id, true);
			provider.setSnippets(getSnippets());
		}),

		vscode.commands.registerCommand('snippet-manager.unpinSnippet', (item?: SnippetItem) => {
			if (!item?.snippet) {
				return;
			}
			setPinned(item.snippet.id, false);
			provider.setSnippets(getSnippets());
		}),

		vscode.commands.registerCommand('snippet-manager.deleteSnippet', async (item?: SnippetItem) => {
			const snippet = item?.snippet;
			if (!snippet) {
				return;
			}
			const confirmed = await vscode.window.showWarningMessage(
				`Delete snippet "${snippet.title}"?`,
				{ modal: true },
				'Delete'
			);
			if (confirmed !== 'Delete') {
				return;
			}
			deleteSnippet(snippet.id);
			provider.setSnippets(getSnippets());
			vscode.window.showInformationMessage(`Snippet "${snippet.title}" deleted.`);
		}),

		vscode.commands.registerCommand('snippet-manager.search', async () => {
			const snippets = getSnippets().filter((s) => !s.hiddenInVscode);
			const picked = await vscode.window.showQuickPick(
				snippets.map((s) => ({
					label: s.title,
					description: s.language,
					detail: s.tags.length ? `Tags: ${s.tags.join(', ')}` : undefined,
					snippet: s,
				})),
				{ placeHolder: 'Search snippets by title, then press Enter to copy' }
			);
			if (!picked) {
				return;
			}
			await copyToClipboard(picked.snippet);
			recordUsage(picked.snippet.id);
			provider.setSnippets(getSnippets());
		})
	);
}
