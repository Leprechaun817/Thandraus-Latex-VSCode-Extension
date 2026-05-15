import * as vscode from 'vscode';

const THANDRAUS_LATEX_LANGUAGE_ID = 'latex';

const TOKEN_TYPES = [
	'namespace',
	'geometryCommand',
	'geometryKey',
	'geometryPreset',
	'geometryValue'
] as const;

const TOKEN_MODIFIERS = [
	'packageProvided',
	'paper',
	'layout',
	'margin',
	'ratio',
	'boolean',
	'restrictedInNewgeometry',
	'length',
	'wildcard',
	'listValue',
	'number',
	'integer',
	'driver'
] as const;

type GeometryTokenType = (typeof TOKEN_TYPES)[number];
type GeometryModifier = (typeof TOKEN_MODIFIERS)[number];

type GeometryContext = 'documentclass' | 'usepackage' | 'geometry' | 'newgeometry';

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

interface DocumentClassInvocation{
	commandStart: number;
	options?: BalancedRegion;
	classGroup?: BalancedRegion;
	className?: PackageNameRange;
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

	//body / total body
	['hscale', ['margin']],
	['vscale', ['margin']],
	['scale', ['margin']],
	['width', ['margin']],
	['height', ['margin']],
	['total', ['margin']],
	['totalwidth', ['margin']],
	['totalheight', ['margin']],
	['text', ['margin']],
	['body', ['margin']],
	['textwidth', ['margin']],
	['textheight', ['margin']],
	['lines', ['margin']],
	

	//margins / body partitions
	['left', ['margin']],
	['lmargin', ['margin']],
	['inner', ['margin']],
	['innermargin', ['margin']],
	['right', ['margin']],
	['rmargin', ['margin']],
	['outer', ['margin']],
	['outermargin', ['margin']],
	['top', ['margin']],
	['tmargin', ['margin']],
	['bottom', ['margin']],
	['bmargin', ['margin']],
	['margin', ['margin']],
	['hmargin', ['margin']],
	['vmargin', ['margin']],
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
	['heightrounded', ['boolean']],

	//Native Dimensions
	['headheight', ['margin']],
	['head', ['margin']],
	['headsep', ['margin']],
	['footskip', ['margin']],
	['foot', ['margin']],
	['nohead', ['margin', 'boolean']],
	['nofoot', ['margin', 'boolean']],
	['noheadfoot', ['margin', 'boolean']],
	['footnotesep', ['margin']],
	['marginparwidth', ['margin']],
	['marginpar', ['margin']],
	['marginparsep', ['margin']],
	['nomarginpar', ['margin', 'boolean']],
	['columnsep', ['margin']],
	['hoffset', ['margin']],
	['voffset', ['margin']],
	['offset', ['margin']],
	['twocolumn', ['margin', 'boolean']],
	['onecolumn', ['margin', 'boolean']],
	['reversemp', ['margin', 'boolean']],
	['reversemarginpar', ['margin', 'boolean']],
	
	//Drivers (LaTeX Drivers)
	['driver', []],
	['dvips', ['boolean']],
	['dvipdfm', ['boolean']],
	['dvipdfmx', ['boolean']],
	['xdvipdfmx', ['boolean']],
	['pdftex', ['boolean']],
	['luatex', ['boolean']],
	['xetex', ['boolean']],
	['vtex', ['boolean']],

	//Other Preamble-based Options
	['verbose', ['boolean']],
	['reset', ['boolean']],
	['resetpaper', ['boolean']],
	['mag', []],
	['truedimen', ['boolean']],
	['pass', ['boolean']],
	['showframe', ['boolean']],
	['showcrop', ['boolean']]
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

	['ansiapaper', ['paper']],
	['ansibpaper', ['paper']],
	['ansicpaper', ['paper']],
	['ansidpaper', ['paper']],
	['ansiepaper', ['paper']],

	['letterpaper', ['paper']],
	['legalpaper', ['paper']],
	['executivepaper', ['paper']],
	['screen', ['paper']]
]);

const PRESET_VALUE_KEYS = new Set(['paper', 'layout']);
const GEOMETRY_DOCUMENTCLASS_KEYS = new Set([
	'landscape',
	'portrait',
	'twoside',
	'twocolumn',
	'onecolumn'
]);

const NUMERIC_VALUE_KEYS = new Set(['hscale', 'vscale', 'scale']);
const INTEGER_VALUE_KEYS = new Set(['lines', 'mag']);
const DRIVER_VALUE_KEYS = new Set(['driver']);

const GEOMETRY_DRIVER_VALUES = new Set([
	'auto',
	'none',
	'dvips',
	'dvipdfm',
	'dvipdfmx',
	'xdvipdfmx',
	'pdftex',
	'luatex',
	'xetex',
	'vtex'
]);

const RESTRICTED_IN_NEWGEOMETRY_KEYS = new Set([
	//Paper size / orientation
	'paper',
	'paperwidth',
	'paperheight',
	'papersize',
	'landscape',
	'portrait',

	//Drivers (LaTeX Drivers)
	'driver',
	'dvips',
	'dvipdfm',
	'dvipdfmx',
	'xdvipdfmx',
	'pdftex',
	'luatex',
	'xetex',
	'vtex',

	//Other Preamble-based options
	'verbose',
	'reset',
	'resetpaper',
	'mag',
	'truedimen',
	'pass',
	'showframe',
	'showcrop'
]);

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
		const ignoredRanges = collectIgnoredRanges(text);
		const packageInvocations = scanPackageInvocations(text, ignoredRanges);

		const geometryPackageInvocations: Array<{
			invocation: PackageInvocation; 
			geometryPackage: PackageNameRange;
		}> = [];

		for(const invocation of packageInvocations) {
			const geometryPackage = invocation.packages.find((pkg)=>pkg.name === 'geometry');
			if(!geometryPackage) {
				continue;
			}

			geometryPackageInvocations.push({invocation, geometryPackage});
		}

		if(geometryPackageInvocations.length === 0) {
			return builder.build();
		}

		//Parse relevant geometry related \documentclass[...] parameters/options first.
		//In most LaTeX files, the \documentclass command will come before \usepackage{geometry}.
		//This is why we're checking and processing both separately as far as the geometry package is concerned
		for(const invocation of scanDocumentClassInvocations(text, ignoredRanges)) {
			if(invocation.options) {
				parseGeometryDocumentClassOptions(document, builder, text, invocation.options.contentStart, invocation.options.contentEnd, ignoredRanges);
			}
		}

		for(const {invocation, geometryPackage} of geometryPackageInvocations) {
			// Mark the visible geometry package name as the namespace token that activates geometry semantics.
			pushTokenByOffsets(builder, document, geometryPackage.start, geometryPackage.end, 'namespace', [], ignoredRanges);

			//Now that we have marked the geometry package, we process the options listed in the package commands:
			//"\usepackage[...]{geometry}" and "\RequirePackage[...]{geometry}"
			if(invocation.options) {
				parseGeometryOptionList(document, builder, text, invocation.options.contentStart, invocation.options.contentEnd, 'usepackage', ignoredRanges);
			}
		}

		scanGeometryCommands(document, builder, text, ignoredRanges);

		return builder.build();
	}
}

function scanGeometryCommands(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string, ignoredRanges: readonly TextSlice[]) : void {
	const commandRegex = /\\(geometry|newgeometry|restoregeometry|savegeometry|loadgeometry)\b/g;

	for(const match of text.matchAll(commandRegex)) {
		const fullMatch = match[0];
		const commandName = match[1];
		const start = match.index ?? 0;
		const end = start + fullMatch.length;

		if(rangeIntersectsIgnored(start, end, ignoredRanges)) {
			continue;
		}

		const baseModifiers = GEOMETRY_COMMANDS.get(commandName) ?? ['packageProvided'];
		pushTokenByOffsets(builder, document, start, end, 'geometryCommand', [...baseModifiers], ignoredRanges);

		if(commandName !== 'geometry' && commandName !== 'newgeometry') {
			continue;
		}

		let cursor = skipWhitespace(text, end);
		if(text[cursor] !== '{') {
			continue;
		}

		const region = readBalanced(text, cursor, '{', '}');
		if(!region) {
			continue;
		}

		parseGeometryOptionList(document, builder, text, region.contentStart, region.contentEnd, commandName === 'newgeometry' ? 'newgeometry' : 'geometry', ignoredRanges);
	}
}

function parseGeometryOptionList(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string, start: number, end: number, context: GeometryContext, ignoredRanges: readonly TextSlice[]) : void {
	for(const item of splitTopLevel(text, start, end, ',')) {
		const trimmed = trimSlice(text, item.start, item.end);
		if(!trimmed || rangeIntersectsIgnored(trimmed.start, trimmed.end, ignoredRanges)) {
			continue;
		}

		const equalsAt = findTopLevelChar(text, trimmed.start, trimmed.end, '=');
		if(equalsAt === -1) {
			const rawName = text.slice(trimmed.start, trimmed.end);
			const name = rawName.toLowerCase();

			if(GEOMETRY_PRESETS.has(name)) {
				emitGeometryPreset(document, builder, trimmed.start, trimmed.end, name, context, true, ignoredRanges);
				continue;
			}

			if(GEOMETRY_KEYS.has(name)) {
				emitGeometryKey(document, builder, trimmed.start, trimmed.end, name, context, ignoredRanges);
			}

			continue;
		}

		const keySlice = trimSlice(text, trimmed.start, equalsAt);
		if(!keySlice) {
			continue;
		}

		const rawKey = text.slice(keySlice.start, keySlice.end);
		const key = rawKey.toLowerCase();

		if(GEOMETRY_PRESETS.has(key)) {
			emitGeometryPreset(document, builder, keySlice.start, keySlice.end, key, context, true, ignoredRanges);
			continue;
		}

		emitGeometryKey(document, builder, keySlice.start, keySlice.end, key, context, ignoredRanges);

		const valueSlice = trimSlice(text, equalsAt + 1, trimmed.end);
		if(!valueSlice) {
			continue;
		}

		const rawValue = text.slice(valueSlice.start, valueSlice.end);
		const value = rawValue.toLowerCase();
		if(PRESET_VALUE_KEYS.has(key) && GEOMETRY_PRESETS.has(value)) {
			const restrictThisOccurrence = context === 'newgeometry' && key === 'paper';
			emitGeometryPreset(document, builder, valueSlice.start, valueSlice.end, value, context, restrictThisOccurrence, ignoredRanges);
		}

		parseGeometryValue(document, builder, text, valueSlice.start, valueSlice.end, key, ignoredRanges);
	}
}

function parseGeometryDocumentClassOptions(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string, start: number, end: number, ignoredRanges: readonly TextSlice[]) : void {
	for(const item of splitTopLevel(text, start, end, ',')) {
		const trimmed = trimSlice(text, item.start, item.end);
		if(!trimmed || rangeIntersectsIgnored(trimmed.start, trimmed.end, ignoredRanges)) {
			continue;
		}

		const equalsAt = findTopLevelChar(text, trimmed.start, trimmed.end, '=');
		
		const optionSlice = equalsAt === -1 ? trimmed : trimSlice(text, trimmed.start, equalsAt);
		if(!optionSlice) {
			continue;
		}

		const rawName = text.slice(optionSlice.start, optionSlice.end);
		
		const name = rawName.toLowerCase();
		if(GEOMETRY_PRESETS.has(name)) {
			emitGeometryPreset(document, builder, optionSlice.start, optionSlice.end, name, 'documentclass', false, ignoredRanges);
			continue;
		}

		if(GEOMETRY_DOCUMENTCLASS_KEYS.has(name) && GEOMETRY_KEYS.has(name)) {
			emitGeometryKey(document, builder, optionSlice.start, optionSlice.end, name, 'documentclass', ignoredRanges);
		}
	}
}

function emitGeometryKey(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, start: number, end: number, key: string, context: GeometryContext, ignoredRanges: readonly TextSlice[]) : void {
	const baseModifiers = GEOMETRY_KEYS.get(key);
	if(!baseModifiers) {
		return;
	}

	const modifiers: GeometryModifier[] = ['packageProvided', ...baseModifiers];
	if(context === 'newgeometry' && RESTRICTED_IN_NEWGEOMETRY_KEYS.has(key)) {
		modifiers.push('restrictedInNewgeometry');
	}

	pushTokenByOffsets(builder, document, start, end, 'geometryKey', uniqueModifiers(modifiers), ignoredRanges);
}

function emitGeometryPreset(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, start: number, end: number, preset: string, context: GeometryContext, restrictThisOccurrence: boolean, ignoredRanges: readonly TextSlice[]) : void {
	const baseModifiers = GEOMETRY_PRESETS.get(preset);
	if(!baseModifiers) {
		return;
	}

	const modifiers: GeometryModifier[] = ['packageProvided', ...baseModifiers];
	if(context === 'newgeometry' && restrictThisOccurrence && RESTRICTED_IN_NEWGEOMETRY_PRESET_KEYS.has(preset)) {
		modifiers.push('restrictedInNewgeometry');
	}

	pushTokenByOffsets(builder, document, start, end, 'geometryPreset', uniqueModifiers(modifiers), ignoredRanges);
}

function scanPackageInvocations(text: string, ignoredRanges: readonly TextSlice[]) : PackageInvocation[] {
	const results: PackageInvocation[] = [];
	
	const commandRegex = /\\(?:usepackage|RequirePackage)\b/g;
	for(const match of text.matchAll(commandRegex)) {
		const commandStart = match.index ?? 0;
		if(offsetInRanges(commandStart, ignoredRanges)) {
			continue;
		}

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
			if(!trimmed || rangeIntersectsIgnored(trimmed.start, trimmed.end, ignoredRanges)) {
				continue;
			}

			packages.push({name: text.slice(trimmed.start, trimmed.end).toLowerCase(), start: trimmed.start, end: trimmed.end});
		}

		results.push({commandStart, options, packageGroup, packages});
	}

	return results;
}

function scanDocumentClassInvocations(text: string, ignoredRanges: readonly TextSlice[]) : DocumentClassInvocation[] {
	const results: DocumentClassInvocation[] = [];
	const commandRegex = /\\documentclass\b/g;

	for(const match of text.matchAll(commandRegex)) {
		const commandStart = match.index ?? 0;
		if(offsetInRanges(commandStart, ignoredRanges)) {
			continue;
		}

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

		let classGroup: BalancedRegion | undefined;
		let className: PackageNameRange | undefined;
		if(text[cursor] === '{') {
			const parsed = readBalanced(text, cursor, '{', '}');
			if(parsed) {
				classGroup = parsed;
				
				const trimmed = trimSlice(text, parsed.contentStart, parsed.contentEnd);
				if(trimmed) {
					className = {name: text.slice(trimmed.start, trimmed.end).toLowerCase(),
								 start: trimmed.start,
								 end: trimmed.end};
				}
			}
		}

		results.push({commandStart, options, classGroup, className});
	}

	return results;
}

function parseGeometryValue(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string, start: number, end: number, key: string, ignoredRanges: readonly TextSlice[]) : void {
	const trimmed = trimSlice(text, start, end);
	if(!trimmed || rangeIntersectsIgnored(trimmed.start, trimmed.end, ignoredRanges)) {
		return;
	}

	const wrapped = readBalanced(text, trimmed.start, '{', '}');
	if(wrapped && wrapped.start === trimmed.start && wrapped.end + 1 === trimmed.end) {
		for(const item of splitTopLevel(text, wrapped.contentStart, wrapped.contentEnd, ',')) {
			const itemTrimmed = trimSlice(text, item.start, item.end);
			if(!itemTrimmed || rangeIntersectsIgnored(itemTrimmed.start, itemTrimmed.end, ignoredRanges)) {
				continue;
			}

			emitGeometryValue(document, builder, text, itemTrimmed.start, itemTrimmed.end, key, ['listValue'], ignoredRanges);
		}
		return;
	}

	emitGeometryValue(document, builder, text, trimmed.start, trimmed.end, key, [], ignoredRanges);
}

function emitGeometryValue(document: vscode.TextDocument, builder: vscode.SemanticTokensBuilder, text: string, start: number, end: number, key: string, extraModifiers: readonly GeometryModifier[], ignoredRanges: readonly TextSlice[]) : void {
	const rawValue = text.slice(start, end).trim();
	const valueModifiers = classifyGeometryValue(rawValue, key);

	if(!valueModifiers) {
		return;
	}

	const modifiers: GeometryModifier[] = ['packageProvided', ...extraModifiers, ...valueModifiers];

	pushTokenByOffsets(builder, document, start, end, 'geometryValue', uniqueModifiers(modifiers), ignoredRanges);
}

function classifyGeometryValue(rawValue: string, key: string) : GeometryModifier[] | null {
	const value = rawValue.trim().toLowerCase();
	if(!value) {
		return null;
	}

	if(value === '*') {
		return ['wildcard'];
	}
	if(value === 'true' || value === 'false') {
		return ['boolean'];
	}
	if(DRIVER_VALUE_KEYS.has(key) && GEOMETRY_DRIVER_VALUES.has(value)) {
		return ['driver'];
	}
	if(INTEGER_VALUE_KEYS.has(key) && /^[+-]?\d+$/.test(value)) {
		return ['integer'];
	}
	if(NUMERIC_VALUE_KEYS.has(key) && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
		return ['number'];
	}
	if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*:\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
		return ['ratio'];
	}
	if(isGeometryLengthLikeValue(value)) {
		return ['length'];
	}

	return null;
}

function isGeometryLengthLikeValue(value: string) : boolean {
	//Examples: 1in, 2.5cm, .75in, -1pt
	if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*(?:pt|bp|in|cm|mm|pc|dd|cc|sp|em|ex)$/.test(value)) {
		return true;
	}

	//Examples: 0.8\paperwidth, .5\textheight
	if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*\\[A-Za-z@]+$/.test(value)) {
		return true;
	}

	//Examples: \paperwidth, \textheight
	if(/^\\[A-Za-z@]+$/.test(value)) {
		return true;
	}

	return false;
}

function pushTokenByOffsets(builder: vscode.SemanticTokensBuilder, document: vscode.TextDocument, start: number, end: number, tokenType: GeometryTokenType, tokenModifiers: readonly string[] = [], ignoredRanges: readonly TextSlice[] = []) : void {
	if(start >= end) {
		return;
	}

	if(rangeIntersectsIgnored(start, end, ignoredRanges)) {
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
			parenDepth = Math.max(0, parenDepth - 1)
		}
		else if(ch === target && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
			return i;
		}
	}

	return -1;
}

function trimSlice(text: string, start: number, end: number) : TextSlice | null {
	while(start < end && /\s/.test(text[start])) {
		start += 1;
	}

	while(end > start && /\s/.test(text[end - 1])) {
		end -= 1;
	}

	if(start >= end) {
		return null;
	}

	return {start, end};
}

function skipWhitespace(text: string, offset: number) : number {
	let i = offset;
	while(i < text.length && /\s/.test(text[i])) {
		i += 1;
	}

	return i;
}

function uniqueModifiers(modifiers: readonly GeometryModifier[]) : GeometryModifier[] {
	const seen = new Set<GeometryModifier>();
	const result: GeometryModifier[] = [];

	for(const modifier of modifiers) {
		if(seen.has(modifier)) {
			continue;
		}

		seen.add(modifier);
		result.push(modifier);
	}

	return result;
}

function collectIgnoredRanges(text: string) : TextSlice[] {
	const ranges: TextSlice[] = [];

	collectLineCommentRanges(text, ranges);
	collectVerbCommandRanges(text, ranges);
	collectVerbatimEnvironmentRanges(text, ranges);

	return mergeRanges(ranges);
}

function collectLineCommentRanges(text: string, ranges: TextSlice[]) : void {
	let lineStart = 0;
	while(lineStart < text.length) {
		const newlineAt = text.indexOf('\n', lineStart);
		const lineEnd = newlineAt === -1 ? text.length : newlineAt;

		for(let i = lineStart; i < lineEnd; i++) {
			if(text[i] === '%' && !isEscaped(text, i)) {
				ranges.push({start: i, end: lineEnd});
				break;
			}
		}

		if(newlineAt === -1) {
			break;
		}

		lineStart = newlineAt + 1;
	}
}

function collectVerbCommandRanges(text: string, ranges: TextSlice[]) : void {
	const verbRegex = /\\verb\*?/g;
	for(const match of text.matchAll(verbRegex)) {
		const start = match.index ?? 0;
		if(offsetInRanges(start, ranges)) {
			continue;
		}

		const delimiterIndex = start + match[0].length;
		if(delimiterIndex >= text.length) {
			continue;
		}

		const delimiter = text[delimiterIndex];
		if(/\s/.test(delimiter)) {
			continue;
		}

		const lineEndAt = text.indexOf('\n', delimiterIndex + 1);
		const searchEnd = lineEndAt === -1 ? text.length : lineEndAt;
		const closeAt = text.indexOf(delimiter, delimiterIndex + 1);

		if(closeAt === -1 || closeAt > searchEnd) {
			ranges.push({start, end: searchEnd});
			continue;
		}

		ranges.push({start, end: closeAt + 1});
	}
}

function collectVerbatimEnvironmentRanges(text: string, ranges: TextSlice[]) : void {
	const beginRegex = /\\begin\{(verbatim\*?|Verbatim|lstlisting|minted|filecontents\*?)\}/g;
	for(const match of text.matchAll(beginRegex)) {
		const start = match.index ?? 0;
		if(offsetInRanges(start, ranges)) {
			continue;
		}

		const environmentName = match[1];
		const endRegex = new RegExp(`\\\\end\\{${escapeRegExp(environmentName)}\\}`, 'g');
		endRegex.lastIndex = start + match[0].length;

		const endMatch = endRegex.exec(text);
		const end = endMatch ? endMatch.index + endMatch[0].length : text.length;

		ranges.push({start, end});
	}
}

function isEscaped(text: string, offset: number) : boolean {
	let slashCount = 0;
	for(let i = offset - 1; i >= 0 && text[i] === '\\'; i--) {
		slashCount += 1;
	}

	return slashCount % 2 === 1;
}

function offsetInRanges(offset: number, ranges: readonly TextSlice[]) : boolean {
	return ranges.some((range) => offset >= range.start && offset < range.end);
}

function rangeIntersectsIgnored(start: number, end: number, ignoredRanges: readonly TextSlice[]) : boolean {
	return ignoredRanges.some((range) => start < range.end && end > range.start);
}

function mergeRanges(ranges: readonly TextSlice[]) : TextSlice[] {
	if(ranges.length === 0) {
		return [];
	}

	const sorted = [...ranges].sort((a, b) => a.start - b.start);
	const merged: TextSlice[] = [sorted[0]];

	for(const range of sorted.slice(1)) {
		const last = merged[merged.length - 1];
		if(range.start <= last.end) {
			last.end = Math.max(last.end, range.end);
			continue;
		}

		merged.push({...range});
	}

	return merged;
}

function escapeRegExp(value: string) : string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

