import * as vscode from 'vscode';
import { validateDocument } from './diagnostics';
import { AnimeCompletionProvider } from './completion';

const ANIME_SELECTOR: vscode.DocumentSelector = { language: 'anime' };

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext): void {
	diagnosticCollection = vscode.languages.createDiagnosticCollection('anime');
	context.subscriptions.push(diagnosticCollection);

	const completionProvider = new AnimeCompletionProvider();

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			ANIME_SELECTOR,
			completionProvider
		)
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			ANIME_SELECTOR,
			completionProvider,
			'@', '=', '{', '[', '.', '_'
		)
	);

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(document => {
			if (document.languageId === 'anime') {
				updateDiagnostics(document);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document.languageId === 'anime') {
				updateDiagnostics(event.document);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(document => {
			diagnosticCollection.delete(document.uri);
		})
	);

	vscode.workspace.textDocuments.forEach(document => {
		if (document.languageId === 'anime') {
			updateDiagnostics(document);
		}
	});
}

function updateDiagnostics(document: vscode.TextDocument): void {
	const diagnostics = validateDocument(document);
	diagnosticCollection.set(document.uri, diagnostics);
}

export function deactivate(): void {
	if (diagnosticCollection) {
		diagnosticCollection.dispose();
	}
}
