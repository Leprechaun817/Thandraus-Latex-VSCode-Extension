import * as vscode from 'vscode';
import {registerGeometrySemanticTokens} from './semantic/geometrySemantic';

export function activate(context: vscode.ExtensionContext): void {
	registerGeometrySemanticTokens(context);
}

export function deactivate(): void {}