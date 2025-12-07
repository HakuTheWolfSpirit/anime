import * as vscode from 'vscode';
import {
	parse,
	File,
	AnimeResource,
	Resource,
	PropertyGroup,
	ExtensionGroup,
	Property,
	PropertyValue,
	ArrayValue,
	NumberValue,
	DateValue,
	Range as ASTRange
} from './parser';

const VALID_VERSIONS = ['2.1'];

const ANIME_PROPERTIES = [
	'original_title', 'year', 'demographic', 'genres', 'dub_languages',
	'related', 'first_aired', 'last_aired'
];

const SEASON_PROPERTIES = ['first_aired', 'last_aired'];
const EPISODE_PROPERTIES = ['filler', 'length', 'air_date', 'synopsis'];
const MOVIE_PROPERTIES = ['filler', 'length', 'release_date', 'description'];
const SPECIAL_PROPERTIES = ['filler', 'length', 'air_date', 'description'];
const CHARACTER_PROPERTIES = ['name'];
const VOICE_ACTOR_PROPERTIES = ['name', 'language'];

const PUBLIC_OPINION_FIELDS: Record<string, { min: number; max: number }> = {
	sounddesign: { min: 0, max: 4 },
	dub: { min: 0, max: 2 },
	voice_acting_quality: { min: 0, max: 4 },
	animation_quality: { min: 0, max: 4 },
	character_design: { min: 0, max: 4 },
	story_and_writing: { min: 0, max: 4 }
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?)?$/;

function astRangeToVsCodeRange(range: ASTRange): vscode.Range {
	return new vscode.Range(
		range.start.line - 1,
		range.start.column - 1,
		range.end.line - 1,
		range.end.column - 1
	);
}

export function validateDocument(document: vscode.TextDocument): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];
	const text = document.getText();

	const { ast, errors } = parse(text);

	for (const error of errors) {
		diagnostics.push(new vscode.Diagnostic(
			astRangeToVsCodeRange(error.range),
			error.message,
			vscode.DiagnosticSeverity.Error
		));
	}

	validateFile(ast, diagnostics);

	return diagnostics;
}

function validateFile(file: File, diagnostics: vscode.Diagnostic[]): void {
	if (!file.version) {
		const range = new vscode.Range(0, 0, 0, 0);
		diagnostics.push(new vscode.Diagnostic(
			range,
			'Missing version declaration. Expected: @version "2.1"',
			vscode.DiagnosticSeverity.Error
		));
	} else {
		if (!VALID_VERSIONS.includes(file.version.version)) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(file.version.range),
				`Unsupported version "${file.version.version}". Supported versions: ${VALID_VERSIONS.join(', ')}`,
				vscode.DiagnosticSeverity.Error
			));
		}
	}

	const animeIds = new Set<string>();
	for (const anime of file.animes) {
		if (animeIds.has(anime.id)) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(anime.range),
				`Duplicate anime identifier "${anime.id}"`,
				vscode.DiagnosticSeverity.Error
			));
		} else {
			animeIds.add(anime.id);
		}
		validateAnimeResource(anime, diagnostics);
	}
}

function validateAnimeResource(anime: AnimeResource, diagnostics: vscode.Diagnostic[]): void {
	validateProperties(anime.properties, ANIME_PROPERTIES, 'anime', diagnostics);
	checkDuplicateProperties(anime.properties, diagnostics);

	const hasOriginalTitle = anime.properties.some(p => p.name === 'original_title');
	const hasLocalizedTitles = anime.propertyGroups.some(g => g.groupType === 'localized_titles');

	if (!hasOriginalTitle && !hasLocalizedTitles) {
		diagnostics.push(new vscode.Diagnostic(
			astRangeToVsCodeRange(anime.range),
			'Anime must have at least one of: original_title or localized_titles',
			vscode.DiagnosticSeverity.Warning
		));
	}

	for (const group of anime.propertyGroups) {
		validatePropertyGroup(group, diagnostics);
	}

	for (const ext of anime.extensionGroups) {
		validateExtensionGroup(ext, diagnostics);
	}

	const resourceIds = new Map<string, Set<string>>();
	for (const resource of anime.resources) {
		const idSet = resourceIds.get(resource.resourceType) || new Set();
		if (idSet.has(resource.id)) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(resource.range),
				`Duplicate ${resource.resourceType} identifier "${resource.id}"`,
				vscode.DiagnosticSeverity.Error
			));
		} else {
			idSet.add(resource.id);
			resourceIds.set(resource.resourceType, idSet);
		}
		validateResource(resource, diagnostics);
	}
}

function validateResource(resource: Resource, diagnostics: vscode.Diagnostic[]): void {
	let validProperties: string[] = [];
	switch (resource.resourceType) {
		case 'season':
			validProperties = SEASON_PROPERTIES;
			break;
		case 'episode':
			validProperties = EPISODE_PROPERTIES;
			break;
		case 'movie':
			validProperties = MOVIE_PROPERTIES;
			break;
		case 'special':
			validProperties = SPECIAL_PROPERTIES;
			break;
		case 'character':
			validProperties = CHARACTER_PROPERTIES;
			break;
		case 'voice_actor':
			validProperties = VOICE_ACTOR_PROPERTIES;
			validateVoiceActor(resource, diagnostics);
			break;
	}

	validateProperties(resource.properties, validProperties, resource.resourceType, diagnostics);
	checkDuplicateProperties(resource.properties, diagnostics);

	for (const group of resource.propertyGroups) {
		validatePropertyGroup(group, diagnostics);
	}

	for (const ext of resource.extensionGroups) {
		validateExtensionGroup(ext, diagnostics);
	}

	const resourceIds = new Map<string, Set<string>>();
	for (const nested of resource.resources) {
		const idSet = resourceIds.get(nested.resourceType) || new Set();
		if (idSet.has(nested.id)) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(nested.range),
				`Duplicate ${nested.resourceType} identifier "${nested.id}"`,
				vscode.DiagnosticSeverity.Error
			));
		} else {
			idSet.add(nested.id);
			resourceIds.set(nested.resourceType, idSet);
		}
		validateResource(nested, diagnostics);
	}
}

function validateVoiceActor(resource: Resource, diagnostics: vscode.Diagnostic[]): void {
	const hasName = resource.properties.some(p => p.name === 'name');
	const hasLanguage = resource.properties.some(p => p.name === 'language');

	if (!hasName) {
		diagnostics.push(new vscode.Diagnostic(
			astRangeToVsCodeRange(resource.range),
			'voice_actor requires "name" property',
			vscode.DiagnosticSeverity.Error
		));
	}

	if (!hasLanguage) {
		diagnostics.push(new vscode.Diagnostic(
			astRangeToVsCodeRange(resource.range),
			'voice_actor requires "language" property',
			vscode.DiagnosticSeverity.Error
		));
	}
}

function validatePropertyGroup(group: PropertyGroup, diagnostics: vscode.Diagnostic[]): void {
	checkDuplicateProperties(group.properties, diagnostics);

	if (group.groupType === 'public_opinion') {
		for (const prop of group.properties) {
			const fieldDef = PUBLIC_OPINION_FIELDS[prop.name];
			if (!fieldDef) {
				diagnostics.push(new vscode.Diagnostic(
					astRangeToVsCodeRange(prop.nameRange),
					`Unknown public_opinion field "${prop.name}". Valid fields: ${Object.keys(PUBLIC_OPINION_FIELDS).join(', ')}`,
					vscode.DiagnosticSeverity.Warning
				));
				continue;
			}

			if (prop.value.type !== 'NumberValue') {
				diagnostics.push(new vscode.Diagnostic(
					astRangeToVsCodeRange(prop.value.range),
					`public_opinion.${prop.name} must be a number`,
					vscode.DiagnosticSeverity.Error
				));
				continue;
			}

			const numValue = prop.value as NumberValue;
			if (!Number.isInteger(numValue.value)) {
				diagnostics.push(new vscode.Diagnostic(
					astRangeToVsCodeRange(prop.value.range),
					`public_opinion.${prop.name} must be an integer`,
					vscode.DiagnosticSeverity.Error
				));
				continue;
			}

			if (numValue.value < fieldDef.min || numValue.value > fieldDef.max) {
				diagnostics.push(new vscode.Diagnostic(
					astRangeToVsCodeRange(prop.value.range),
					`public_opinion.${prop.name} must be between ${fieldDef.min} and ${fieldDef.max}`,
					vscode.DiagnosticSeverity.Error
				));
			}
		}
	}

	if (group.groupType === 'localized_titles' || group.groupType === 'streaming_titles') {
		for (const prop of group.properties) {
			if (prop.value.type !== 'StringValue') {
				diagnostics.push(new vscode.Diagnostic(
					astRangeToVsCodeRange(prop.value.range),
					`${group.groupType} values must be strings`,
					vscode.DiagnosticSeverity.Error
				));
			}
		}
	}
}

function validateExtensionGroup(ext: ExtensionGroup, diagnostics: vscode.Diagnostic[]): void {
	checkDuplicateProperties(ext.properties, diagnostics);

	for (const prop of ext.properties) {
		validatePropertyValue(prop.value, diagnostics);
	}

	for (const group of ext.propertyGroups) {
		validatePropertyGroup(group, diagnostics);
	}
}

function validateProperties(
	properties: Property[],
	validNames: string[],
	context: string,
	diagnostics: vscode.Diagnostic[]
): void {
	for (const prop of properties) {
		if (!validNames.includes(prop.name)) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(prop.nameRange),
				`Unknown property "${prop.name}" in ${context}`,
				vscode.DiagnosticSeverity.Warning
			));
		}

		validatePropertyValue(prop.value, diagnostics);
	}
}

function validatePropertyValue(value: PropertyValue, diagnostics: vscode.Diagnostic[]): void {
	if (value.type === 'NumberValue') {
		const numValue = value as NumberValue;
		if (numValue.raw.match(/^-?0\d+/)) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(value.range),
				'Leading zeros are not permitted in numbers',
				vscode.DiagnosticSeverity.Error
			));
		}
	}

	if (value.type === 'DateValue') {
		const dateValue = value as DateValue;
		if (!ISO_DATE_REGEX.test(dateValue.value)) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(value.range),
				`Invalid date format. Expected ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDThh:mm:ss)`,
				vscode.DiagnosticSeverity.Error
			));
		} else {
			const date = new Date(dateValue.value);
			if (isNaN(date.getTime())) {
				diagnostics.push(new vscode.Diagnostic(
					astRangeToVsCodeRange(value.range),
					`Invalid date value "${dateValue.value}"`,
					vscode.DiagnosticSeverity.Error
				));
			}
		}
	}

	if (value.type === 'ArrayValue') {
		const arrayValue = value as ArrayValue;
		validateArrayHomogeneity(arrayValue, diagnostics);
	}
}

function validateArrayHomogeneity(array: ArrayValue, diagnostics: vscode.Diagnostic[]): void {
	if (array.elements.length === 0) {
		return;
	}

	const firstType = array.elements[0].type;
	for (let i = 1; i < array.elements.length; i++) {
		const element = array.elements[i];
		if (element.type !== firstType) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(element.range),
				`Type mismatch in array. First element type: ${firstType}, but element at index ${i} is ${element.type}`,
				vscode.DiagnosticSeverity.Error
			));
		}

		validatePropertyValue(element, diagnostics);
	}
}

function checkDuplicateProperties(properties: Property[], diagnostics: vscode.Diagnostic[]): void {
	const seen = new Map<string, Property>();
	for (const prop of properties) {
		const existing = seen.get(prop.name);
		if (existing) {
			diagnostics.push(new vscode.Diagnostic(
				astRangeToVsCodeRange(prop.nameRange),
				`Duplicate property "${prop.name}"`,
				vscode.DiagnosticSeverity.Error
			));
		} else {
			seen.set(prop.name, prop);
		}
	}
}
