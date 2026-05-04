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

		for(const invocation of packageInvocations) {
			const geometryPackage = invocation.packages.find(
				(pkg) => pkg.name === 'geometry'
			);

			if(!geometryPackage) {
				continue;
			}
			
			geometryLoadedVisibly = true;

			//Mark the package name itself
			pushTokenByOffsets(builder, document, geometryPackage.start, geometryPackage.end, 'namespace');

			//Parse \usepackage[...]{geometry} / \RequirePackage[...]{geometry}
			if(invocation.options) {
				parseGeometryOptionList(document, builder, text, invocation.options.contentStart, invocation.options.contentEnd, 'usepackage');
			}
		}

		if(!geometryLoadedVisibly) {
			return builder.build();
		}

		scanGeometryCommands(document, builder, text);


		return builder.build();
	}
}

function scanGeometryCommands(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string) : void {
	const commandRegex = /\\(geometry|newgeometry|restoregeometry|savegeomemtry|loadgeometry)\b/g;

	for(const match of text.matchAll(commandRegex)) {
		const fullMatch = match[0];
		const commandName = match[1];
		const start = match.index ?? 0;
		const end = start + fullMatch.length;

		const baseModifiers = GEOMETRY_COMMANDS.get(commandName) ?? ['packageProvided'];
		pushTokenByOffsets(builder, document, start, end, 'geometryCommand', [...baseModifiers]);

		if(commandName !== 'geometry' && commandName !== 'newgeometry') {
			continue;
		}

		let cursor = skipWhitespace(text, end);
		if(text[cursor] !== '{') {
			continue;
		}

		const region = readBalanced(text, cursor, '{', '}')l
		if(!region) {
			continue;
		}

		parseGeometryOptionList(document, builder, text, region.contentStart, region.contentEnd, commandName === 'newgeometry' ? 'newgeometry' : 'geometry');
	}
}

function parseGeometryOptionList(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string, start: number, end: number, context: GeometryContext) : void {
	for(const item of splitTopLevel(text, start, end, ',')) {
		const trimmed = trimSlice(text, item.start, item.end);
		if(!trimmed) {
			continue;
		}

		const equalsAt = findTopLevelChar(text, trimmed.start, trimmed.end, '=');
		if(equalsAt === -1) {
			const rawName = text.slice(trimmed.start, trimmed.end);
			const name = rawName.toLowerCase();

			if(GEOMETRY_PRESETS.has(name)) {
				emitGeometryPreset(document, builder, trimmed.start, trimmed.end, name, context, true);
				continue;
			}

			if(GEOMETRY_KEYS.has(name)) {
				emitGeometryKey(document, builder, trimmed.start, trimmed.end, name, context);
			}

			continue;
		}

		const keySlice = trimSlice(text, trimmed.start, equalsAt);
		if(!keySlice) {
			continue;
		}

		const rawKey = text.slice(keySlice.start, keySlice.end);
		const key = rawKey.toLowerCase();

		emitGeometryKey(document, builder, keySlice.start, keySlice.end, key, context);

		const valueSlice = trimSlice(text, equalsAt + 1, trimmed.end);
		if(!valueSlice) {
			continue;
		}

		const rawValue = text.slice(valueSlice.start, valueSlice.end);
		const value = rawValue.toLowerCase();
		if(PRESET_VALUE_KEYS.has(key) && GEOMETRY_PRESETS.has(value)) {
			const restrictThisOccurrence = context === 'newgeometry' && key === 'paper';
			emitGeometryPreset(document, builder, valueSlice.start, valueSlice.end, value, context, restrictThisOccurrence);
		}
	}
}

function emitGeometryKey(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, start: number, end: number, key: string, context: GeometryContext) : void {
	const baseModifiers = GEOMETRY_KEYS.get(key);
	if(!baseModifiers) {
		return;
	}

	const modifiers: GeometryModifier[] = ['packageProvided', ...baseModifiers];
	if(context === 'newgeometry' && RESTRICTED_IN_NEWGEOMETRY_KEYS.has(key)) {
		modifiers.push('restrictedInNewgeometry');
	}

	pushTokenByOffsets(builder, document, start, end, 'geometryKey', uniqueModifiers(modifiers));
}

function emitGeometryPreset(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, start: number, end: number, preset: string, context: GeometryContext, restrictThisOccurrence: boolean) : void {
	const baseModifiers = GEOMETRY_PRESETS.get(preset);
	if(!baseModifiers) {
		return;
	}

	const modifiers: GeometryModifier[] = ['packageProvided', ...baseModifiers];
	if(context === 'newgeometry' && restrictThisOccurrence && RESTRICTED_IN_NEWGEOMETRY_PRESET_KEYS.has(preset)) {
		modifiers.push('restrictedInNewgeometry');
	}

	pushTokenByOffsets(builder, document, start, end, 'geometryPreset', uniqueModifiers(modifiers));
}

function scanPackageInvocations(text: string) : PackageInvocation[] {
	const results: PackageInvocation[] = [];
	
	const commandRegex = /\\(?:usepackage|RequirePackage)\b/g;
	for(const match of text.matchAll(commandRegex)) {
		const commandStart = match.index ?? 0;
		let cursor = skipWhitespace(text, commandStart + match[0].length);

		let options: BalancedRegion | undefined;
		if(text[cursor] === '[') {
			const parsed = readBalanced(text, cursor, '[', ']');
			if(!parsed) {
				continue;
			}

			options = parsed;
			cursor = skipWhitespace(text, parsed.end + 1);
		}

		if(text[cursor] !== '{') {
			continue;
		}

		const packageGroup = readBalanced(text, cursor, '{', '}');
		if(!packageGroup) {
			continue;
		}

		const packages: PackageNameRange[] = [];
		for(const pkgSlice of splitTopLevel(text, packageGroup.contentStart, packageGroup.contentEnd, ',')) {
			const trimmed = trimSlice(text, pkgSlice.start, pkgSlice.end);
			if(!trimmed) {
				continue;
			}

			packages.push({name: text.slice(trimmed.start, trimmed.end).toLowerCase(), start: trimmed.start, end: trimmed.end});
		}

		results.push({commandStart, options, packageGroup, packages});
	}


	return results;
}

function pushTokenByOffsets(builder: vscode.SemanticTokensBuilder, document: vscode.TextDocument, start: number, end: number, tokenType: GeometryTokenType, tokenModifiers: readonly string[] = []) : void {
	if(start >= end) {
		return;
	}

	const range = new vscode.Range(document.positionAt(start), document.positionAt(end));
	//Semantic Tokens must be single-line
	if(range.start.line !== range.end.line) {
		return;
	}

	builder.push(range, tokenType, tokenModifiers);
}

function readBalanced(text: string, openIndex: number, openChar: string, closeChar: string) : BalancedRegion | null {
	if(text[openIndex] !== openChar) {
		return null;
	}

	let depth = 1;

	for(let i = openIndex + 1; i < text.length; i++) {
		const ch = text[i];

		//Treat escaped delimiters like \{ or \] as literal characters
		if(ch === '\\') {
			i += 1;
			continue;
		}

		if(ch === openChar) {
			depth += 1;
			continue;
		}

		if(ch === closeChar) {
			depth -= 1;
			if(depth === 0) {
				return {start: openIndex, end: i, contentStart: openIndex + 1, contentEnd: i};
			}
		}
	}

	return null;
}

function splitTopLevel(text: string, start: number, end: number, separator: string) : TextSlice[] {
	const slices: TextSlice[] = [];
	let segmentStart = start;
	let braceDepth = 0;
	let bracketDepth = 0;
	let parenDepth = 0;

	for(let i = start; i < end; i++) {
		const ch = text[i];
		if(ch === '\\') {
			i += 1;
			continue;
		}

		if(ch === '{') {
			braceDepth += 1;
		}
		else if(ch === '}') {
			braceDepth = Math.max(0, braceDepth - 1);
		}
		else if(ch === '[') {
			bracketDepth += 1;
		}
		else if(ch === ']') {
			bracketDepth = Math.max(0, bracketDepth - 1);
		}
		else if(ch === '(') {
			parenDepth += 1;
		}
		else if(ch === ')') {
			parenDepth = Math.max(0, parenDepth - 1);
		}
		else if(ch === separator && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
			slices.push({start: segmentStart, end: i});
			segmentStart = i + 1;
		}
	}

	slices.push({start: segmentStart, end});
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

