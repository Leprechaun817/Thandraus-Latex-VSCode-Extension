import * as vscode from 'vscode';

const THANDRAUS_LATEX_LANGUAGE_ID = 'thandraus-latex';

const TOKEN_TYPES = [
	'namespace',
	'geometryCommand',
	'geometryKey',
	'geometryPreset'
] as const;

const TOKEN_MODIFIERS = [
	'packageProvided',
	'paper',
	'layout',
	'margin',
	'ratio',
	'boolean',
	'restrictedInNewgeometry'
] as const;

type GeometryTokenType = (typeof TOKEN_TYPES)[number];
type GeometryModifier = (typeof TOKEN_MODIFIERS)[number];

type GeometryContext = 'usepackage' | 'geometry' | 'newgeometry';

interface TextSlice {
	start: number;
	end: number; // half-open
}

interface BalancedRegion extends TextSlice {
	contentStart: number;
	contentEnd: number; // half-open
}

interface PackageNameRange extends TextSlice {
	name: string;
}

interface PackageInvocation {
	commandStart: number;
	options?: BalancedRegion;
	packageGroup?: BalancedRegion;
	packages: PackageNameRange[];
}

const GEOMETRY_LEGEND = new vscode.SemanticTokensLegend(
	[...TOKEN_TYPES],
	[...TOKEN_MODIFIERS]
);

const GEOMETRY_COMMANDS = new Map<string, readonly GeometryModifier[]>([
	['geometry', ['packageProvided']],
	['newgeometry', ['packageProvided']],
	['restoregeometry', ['packageProvided']],
	['savegeometry', ['packageProvided']],
	['loadgeometry', ['packageProvided']]
]);

const GEOMETRY_KEYS = new Map<string, readonly GeometryModifier[]>([
	//paper / paper-size
	['paper', ['paper']],
	['paperwidth', ['paper']],
	['paperheight', ['paper']],
	['papersize', ['paper']],
	['landscape', ['paper', 'boolean']],
	['portrait', ['paper', 'boolean']],
	
	//layout
	['layout', ['layout']],
	['layoutwidth', ['layout']],
	['layoutheight', ['layout']],
	['layoutsize', ['layout']],
	['layoutoffset', ['layout']],
	['layouthoffset', ['layout']],
	['layoutvoffset', ['layout']],

	//margins / body / total
	['left', ['margin']],
	['right', ['margin']],
	['top', ['margin']],
	['bottom', ['margin']],
	['inner', ['margin']],
	['outer', ['margin']],
	['margin', ['margin']],
	['hmargin', ['margin']],
	['vmargin', ['margin']],
	['width', ['margin']],
	['height', ['margin']],
	['text', ['margin']],
	['total', ['margin']],
	['bindingoffset', ['margin']],
	['hdivide', ['margin']],
	['vdivide', ['margin']],
	['divide', ['margin']],
	
	//ratios / centering
	['hmarginratio', ['ratio']],
	['vmarginratio', ['ratio']],
	['marginratio', ['ratio']],
	['hratio', ['ratio']],
	['vratio', ['ratio']],
	['ratio', ['ratio']],
	['hcentering', ['margin', 'boolean']],
	['vcentering', ['margin', 'boolean']],
	['centering', ['margin', 'boolean']],

	//Common booleans likely seen in real geometry usage
	['twoside', ['margin', 'boolean']],
	['asymmetric', ['margin', 'boolean']],
	['includehead', ['margin', 'boolean']],
	['includefoot', ['margin', 'boolean']],
	['includeheadfoot', ['margin', 'boolean']],
	['includemp', ['margin', 'boolean']],
	['includeall', ['margin', 'boolean']],
	['ignorehead', ['margin', 'boolean']],
	['ignorefoot', ['margin', 'boolean']],
	['ignoreheadfoot', ['margin', 'boolean']],
	['ignoremp', ['margin', 'boolean']],
	['ignoreall', ['margin', 'boolean']],
	['showframe', ['boolean']],
	['showcrop', ['boolean']],
	['heightrounded', ['boolean']]
]);

const GEOMETRY_PRESETS = new Map<string, readonly GeometryModifier[]>([
	['a0paper', ['paper']],
	['a1paper', ['paper']],
	['a2paper', ['paper']],
	['a3paper', ['paper']],
	['a4paper', ['paper']],
	['a5paper', ['paper']],
	['a6paper', ['paper']],
	['b0paper', ['paper']],
	['b1paper', ['paper']],
	['b2paper', ['paper']],
	['b3paper', ['paper']],
	['b4paper', ['paper']],
	['b5paper', ['paper']],
	['b6paper', ['paper']],
	['c0paper', ['paper']],
	['c1paper', ['paper']],
	['c2paper', ['paper']],
	['c3paper', ['paper']],
	['c4paper', ['paper']],
	['c5paper', ['paper']],
	['c6paper', ['paper']],
	['b0j', ['paper']],
	['b1j', ['paper']],
	['b2j', ['paper']],
	['b3j', ['paper']],
	['b4j', ['paper']],
	['b5j', ['paper']],
	['b6j', ['paper']],
	['letterpaper', ['paper']],
	['legalpaper', ['paper']],
	['executivepaper', ['paper']],
	['screen', ['paper']]
]);

const PRESET_VALUE_KEYS = new Set(['paper', 'layout']);

const RESTRICTED_IN_NEWGEOMETRY_KEYS = new Set(['paper', 'paperwidth', 'paperheight', 'papersize', 'landscape', 'portrait']);

//bare a4paper, letterpaper, screen, etc.
const RESTRICTED_IN_NEWGEOMETRY_PRESET_KEYS = new Set([...GEOMETRY_PRESETS.keys()]);

export function registerGeometrySemanticTokens(context: vscode.ExtensionContext, languageId = THANDRAUS_LATEX_LANGUAGE_ID) : void {
	const selector: vscode.DocumentSelector = [{language: languageId}];

	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(selector, new GeometrySemanticTokensProvider(), GEOMETRY_LEGEND));
}

class GeometrySemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	provideDocumentSemanticTokens(document: vscode.TextDocument) : vscode.ProviderResult<vscode.SemanticTokens> {
		const text = document.getText();
		const builder = new vscode.SemanticTokensBuilder(GEOMETRY_LEGEND);
		const packageInvocations = scanPackageInvocations(text);

		let geometryLoadedVisibly = false;


		return builder.build();
	}
}

function scanGeometryCommands(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string) : void {
	
}

function parseGeometryOptionList(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string, start: number, end: number, context: GeometryContext) : void {

}

function emitGeometryKey(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, start: number, end: number, key: string, context: GeometryContext) : void {

}

function emitGeometryPreset(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, start: number, end: number, preset: string, context: GeometryContext, restrictThisOccurrence: boolean) : void {

}

function scanPackageInvocations(text: string) : PackageInvocation[] {
	const results: PackageInvocation[] = [];

	return results;
}

function pushTokenByOffsets(builder: vscode.SemanticTokensBuilder, document: vscode.TextDocument, start: number, end: number, tokenType: GeometryTokenType, tokenModifiers: readonly string[] = []) : void {

}

function readBalanced(text: string, openIndex: number, openChar: string, closeChar: string) : BalancedRegion | null {
	
	return null;
}

function splitTopLevel(text: string, start: number, end: number, separator: string) : TextSlice[] {
	const slices: TextSlice[] = [];

	return slices;
}

function findTopLevelChar(text: string, start: number, end: number, target: string) : number {

	return -1;
}

function trimSlice(text: string, start: number, end: number) : TextSlice | null {

	return null;
}

function skipWhitespace(text: string, offset: number) : number {
	let i = offset;

	return i;
}

function uniqueModifiers(modifiers: readonly GeometryModifier[]) : GeometryModifier[] {
	const result: GeometryModifier[] = [];

	return result;
}

