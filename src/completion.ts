import * as vscode from 'vscode';

interface CompletionContext {
	inAnime: boolean;
	inSeason: boolean;
	inEpisode: boolean;
	inMovie: boolean;
	inSpecial: boolean;
	inCharacter: boolean;
	inVoiceActor: boolean;
	inLocalizedTitles: boolean;
	inStreamingTitles: boolean;
	inPublicOpinion: boolean;
	inExtension: boolean;
	afterEquals: boolean;
	inArray: boolean;
}

const RESOURCE_KEYWORDS = [
	{ label: 'season', detail: 'Season resource' },
	{ label: 'episode', detail: 'Episode resource' },
	{ label: 'movie', detail: 'Movie resource' },
	{ label: 'special', detail: 'Special/OVA resource' },
	{ label: 'character', detail: 'Character resource' },
	{ label: 'voice_actor', detail: 'Voice actor resource' }
];

const PROPERTY_GROUPS = [
	{ label: 'localized_titles', detail: 'Localized title translations' },
	{ label: 'streaming_titles', detail: 'Platform-specific titles' },
	{ label: 'public_opinion', detail: 'Technical quality ratings' }
];

const ANIME_PROPERTIES = [
	{ label: 'original_title', detail: 'Original title (string)', insertText: 'original_title = "$0"' },
	{ label: 'year', detail: 'Release year (integer)', insertText: 'year = $0' },
	{ label: 'demographic', detail: 'Target demographic (string)', insertText: 'demographic = "$0"' },
	{ label: 'genres', detail: 'Genre list (string[])', insertText: 'genres = [$0]' },
	{ label: 'dub_languages', detail: 'Available dub languages (string[])', insertText: 'dub_languages = [$0]' },
	{ label: 'related', detail: 'Related anime IDs (string[])', insertText: 'related = [$0]' },
	{ label: 'first_aired', detail: 'First air date', insertText: 'first_aired = date("$0")' },
	{ label: 'last_aired', detail: 'Last air date', insertText: 'last_aired = date("$0")' }
];

const SEASON_PROPERTIES = [
	{ label: 'first_aired', detail: 'Season premiere date', insertText: 'first_aired = date("$0")' },
	{ label: 'last_aired', detail: 'Season finale date', insertText: 'last_aired = date("$0")' }
];

const EPISODE_PROPERTIES = [
	{ label: 'filler', detail: 'Is filler episode (boolean)', insertText: 'filler = $0' },
	{ label: 'length', detail: 'Duration in minutes (number)', insertText: 'length = $0' },
	{ label: 'air_date', detail: 'Original air date', insertText: 'air_date = date("$0")' },
	{ label: 'synopsis', detail: 'Episode description (string)', insertText: 'synopsis = "$0"' }
];

const MOVIE_PROPERTIES = [
	{ label: 'filler', detail: 'Is non-canon (boolean)', insertText: 'filler = $0' },
	{ label: 'length', detail: 'Duration in minutes (number)', insertText: 'length = $0' },
	{ label: 'release_date', detail: 'Theatrical release date', insertText: 'release_date = date("$0")' },
	{ label: 'description', detail: 'Movie description (string)', insertText: 'description = "$0"' }
];

const SPECIAL_PROPERTIES = [
	{ label: 'filler', detail: 'Is non-canon (boolean)', insertText: 'filler = $0' },
	{ label: 'length', detail: 'Duration in minutes (number)', insertText: 'length = $0' },
	{ label: 'air_date', detail: 'Air date', insertText: 'air_date = date("$0")' },
	{ label: 'description', detail: 'Special description (string)', insertText: 'description = "$0"' }
];

const CHARACTER_PROPERTIES = [
	{ label: 'name', detail: 'Character display name (string)', insertText: 'name = "$0"' }
];

const VOICE_ACTOR_PROPERTIES = [
	{ label: 'name', detail: 'Voice actor name (string)', insertText: 'name = "$0"' },
	{ label: 'language', detail: 'Language code (ISO 639-1)', insertText: 'language = "$0"' }
];

const PUBLIC_OPINION_PROPERTIES = [
	{ label: 'sounddesign', detail: 'Audio design quality (0-4)', insertText: 'sounddesign = $0' },
	{ label: 'dub', detail: 'Dub availability/quality (0-2)', insertText: 'dub = $0' },
	{ label: 'voice_acting_quality', detail: 'Voice acting performance (0-4)', insertText: 'voice_acting_quality = $0' },
	{ label: 'animation_quality', detail: 'Visual animation quality (0-4)', insertText: 'animation_quality = $0' },
	{ label: 'character_design', detail: 'Character design quality (0-4)', insertText: 'character_design = $0' },
	{ label: 'story_and_writing', detail: 'Narrative quality (0-4)', insertText: 'story_and_writing = $0' }
];

const COMMON_LANGUAGES = [
	{ label: 'en', detail: 'English' },
	{ label: 'ja', detail: 'Japanese' },
	{ label: 'de', detail: 'German' },
	{ label: 'fr', detail: 'French' },
	{ label: 'es', detail: 'Spanish' },
	{ label: 'it', detail: 'Italian' },
	{ label: 'pt', detail: 'Portuguese' },
	{ label: 'ko', detail: 'Korean' },
	{ label: 'zh', detail: 'Chinese' }
];

const COMMON_STREAMING_PLATFORMS = [
	{ label: 'crunchyroll', detail: 'Crunchyroll' },
	{ label: 'netflix', detail: 'Netflix' },
	{ label: 'funimation', detail: 'Funimation' },
	{ label: 'hulu', detail: 'Hulu' },
	{ label: 'disney-plus', detail: 'Disney+' },
	{ label: 'amazon-prime', detail: 'Amazon Prime Video' },
	{ label: 'hidive', detail: 'HIDIVE' }
];

const COMMON_DEMOGRAPHICS = [
	{ label: 'Shounen', detail: 'Young male audience' },
	{ label: 'Shoujo', detail: 'Young female audience' },
	{ label: 'Seinen', detail: 'Adult male audience' },
	{ label: 'Josei', detail: 'Adult female audience' },
	{ label: 'Kodomo', detail: 'Children audience' }
];

const COMMON_GENRES = [
	'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
	'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
	'Supernatural', 'Thriller', 'Mecha', 'Music', 'Psychological'
];

export class AnimeCompletionProvider implements vscode.CompletionItemProvider {
	provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.CompletionItem[] {
		const context = this.analyzeContext(document, position);
		const linePrefix = document.lineAt(position).text.substring(0, position.character);
		const items: vscode.CompletionItem[] = [];

		if (context.afterEquals) {
			return this.getValueCompletions(linePrefix, context);
		}

		if (context.inPublicOpinion) {
			for (const prop of PUBLIC_OPINION_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			return items;
		}

		if (context.inLocalizedTitles) {
			for (const lang of COMMON_LANGUAGES) {
				items.push(this.createSnippetCompletion(
					lang.label,
					lang.detail,
					`${lang.label} = "$0"`,
					vscode.CompletionItemKind.Property
				));
			}
			return items;
		}

		if (context.inStreamingTitles) {
			for (const platform of COMMON_STREAMING_PLATFORMS) {
				items.push(this.createSnippetCompletion(
					platform.label,
					platform.detail,
					`${platform.label} = "$0"`,
					vscode.CompletionItemKind.Property
				));
			}
			return items;
		}

		if (context.inVoiceActor) {
			for (const prop of VOICE_ACTOR_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			return items;
		}

		if (context.inCharacter) {
			for (const prop of CHARACTER_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			items.push(this.createSnippetCompletion(
				'voice_actor',
				'Voice actor resource',
				'voice_actor "$1" {\n\tname = "$2"\n\tlanguage = "$3"\n}',
				vscode.CompletionItemKind.Class
			));
			items.push(this.createSnippetCompletion(
				'localized_titles',
				'Localized title translations',
				'localized_titles {\n\t$0\n}',
				vscode.CompletionItemKind.Struct
			));
			return items;
		}

		if (context.inSpecial) {
			for (const prop of SPECIAL_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			for (const group of PROPERTY_GROUPS) {
				items.push(this.createSnippetCompletion(
					group.label,
					group.detail,
					`${group.label} {\n\t$0\n}`,
					vscode.CompletionItemKind.Struct
				));
			}
			items.push(this.createExtensionSnippet());
			return items;
		}

		if (context.inMovie) {
			for (const prop of MOVIE_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			for (const group of PROPERTY_GROUPS) {
				items.push(this.createSnippetCompletion(
					group.label,
					group.detail,
					`${group.label} {\n\t$0\n}`,
					vscode.CompletionItemKind.Struct
				));
			}
			items.push(this.createExtensionSnippet());
			return items;
		}

		if (context.inEpisode) {
			for (const prop of EPISODE_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			for (const group of PROPERTY_GROUPS) {
				items.push(this.createSnippetCompletion(
					group.label,
					group.detail,
					`${group.label} {\n\t$0\n}`,
					vscode.CompletionItemKind.Struct
				));
			}
			items.push(this.createExtensionSnippet());
			return items;
		}

		if (context.inSeason) {
			for (const prop of SEASON_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			items.push(this.createSnippetCompletion(
				'episode',
				'Episode resource',
				'episode "$1" {\n\t$0\n}',
				vscode.CompletionItemKind.Class
			));
			items.push(this.createSnippetCompletion(
				'localized_titles',
				'Localized title translations',
				'localized_titles {\n\t$0\n}',
				vscode.CompletionItemKind.Struct
			));
			return items;
		}

		if (context.inAnime) {
			for (const prop of ANIME_PROPERTIES) {
				items.push(this.createSnippetCompletion(
					prop.label,
					prop.detail,
					prop.insertText,
					vscode.CompletionItemKind.Property
				));
			}
			for (const resource of RESOURCE_KEYWORDS) {
				items.push(this.createSnippetCompletion(
					resource.label,
					resource.detail,
					`${resource.label} "$1" {\n\t$0\n}`,
					vscode.CompletionItemKind.Class
				));
			}
			for (const group of PROPERTY_GROUPS) {
				items.push(this.createSnippetCompletion(
					group.label,
					group.detail,
					`${group.label} {\n\t$0\n}`,
					vscode.CompletionItemKind.Struct
				));
			}
			items.push(this.createExtensionSnippet());
			return items;
		}

		items.push(this.createSnippetCompletion(
			'@version',
			'Version declaration (required at start of file)',
			'@version "2.1"',
			vscode.CompletionItemKind.Keyword
		));

		items.push(this.createSnippetCompletion(
			'anime',
			'Anime resource declaration',
			'anime "$1" {\n\toriginal_title = "$2"\n\t\n\tlocalized_titles {\n\t\ten = "$3"\n\t}\n\t$0\n}',
			vscode.CompletionItemKind.Class
		));

		return items;
	}

	private getValueCompletions(
		linePrefix: string,
		context: CompletionContext
	): vscode.CompletionItem[] {
		const items: vscode.CompletionItem[] = [];

		const propertyMatch = linePrefix.match(/(\w+)\s*=\s*$/);
		const propertyName = propertyMatch ? propertyMatch[1] : '';

		if (propertyName === 'filler') {
			items.push(this.createCompletion('true', 'Boolean true', vscode.CompletionItemKind.Value));
			items.push(this.createCompletion('false', 'Boolean false', vscode.CompletionItemKind.Value));
			return items;
		}

		if (propertyName === 'demographic') {
			for (const demo of COMMON_DEMOGRAPHICS) {
				items.push(this.createSnippetCompletion(
					demo.label,
					demo.detail,
					`"${demo.label}"`,
					vscode.CompletionItemKind.Value
				));
			}
			return items;
		}

		if (propertyName === 'genres') {
			items.push(this.createSnippetCompletion(
				'genres array',
				'Common genres array',
				'["$0"]',
				vscode.CompletionItemKind.Value
			));
			return items;
		}

		if (propertyName === 'dub_languages') {
			items.push(this.createSnippetCompletion(
				'languages array',
				'Language codes array',
				'["ja", "en"$0]',
				vscode.CompletionItemKind.Value
			));
			return items;
		}

		if (propertyName === 'language') {
			for (const lang of COMMON_LANGUAGES) {
				items.push(this.createSnippetCompletion(
					lang.label,
					lang.detail,
					`"${lang.label}"`,
					vscode.CompletionItemKind.Value
				));
			}
			return items;
		}

		if (['air_date', 'first_aired', 'last_aired', 'release_date'].includes(propertyName)) {
			const today = new Date().toISOString().split('T')[0];
			items.push(this.createSnippetCompletion(
				'date',
				'Date value',
				`date("$\{1:${today}\}")`,
				vscode.CompletionItemKind.Function
			));
			return items;
		}

		if (context.inPublicOpinion) {
			for (let i = 0; i <= 4; i++) {
				items.push(this.createCompletion(
					i.toString(),
					`Rating value ${i}`,
					vscode.CompletionItemKind.Value
				));
			}
			return items;
		}

		if (context.inArray) {
			const inGenresArray = linePrefix.includes('genres');
			if (inGenresArray) {
				for (const genre of COMMON_GENRES) {
					items.push(this.createSnippetCompletion(
						genre,
						`Genre: ${genre}`,
						`"${genre}"`,
						vscode.CompletionItemKind.Value
					));
				}
			}

			const inLanguagesArray = linePrefix.includes('dub_languages');
			if (inLanguagesArray) {
				for (const lang of COMMON_LANGUAGES) {
					items.push(this.createSnippetCompletion(
						lang.label,
						lang.detail,
						`"${lang.label}"`,
						vscode.CompletionItemKind.Value
					));
				}
			}
			return items;
		}

		items.push(this.createCompletion('true', 'Boolean true', vscode.CompletionItemKind.Value));
		items.push(this.createCompletion('false', 'Boolean false', vscode.CompletionItemKind.Value));
		items.push(this.createSnippetCompletion(
			'date',
			'Date value',
			'date("$0")',
			vscode.CompletionItemKind.Function
		));

		return items;
	}

	private analyzeContext(document: vscode.TextDocument, position: vscode.Position): CompletionContext {
		const context: CompletionContext = {
			inAnime: false,
			inSeason: false,
			inEpisode: false,
			inMovie: false,
			inSpecial: false,
			inCharacter: false,
			inVoiceActor: false,
			inLocalizedTitles: false,
			inStreamingTitles: false,
			inPublicOpinion: false,
			inExtension: false,
			afterEquals: false,
			inArray: false
		};

		const text = document.getText(new vscode.Range(0, 0, position.line, position.character));
		const lineText = document.lineAt(position.line).text.substring(0, position.character);

		if (lineText.match(/=\s*$/)) {
			context.afterEquals = true;
		}

		if (lineText.match(/\[\s*(?:"[^"]*"\s*,\s*)*$/) || lineText.match(/,\s*$/)) {
			context.inArray = true;
		}

		let braceDepth = 0;
		const blockStack: string[] = [];

		const lines = text.split('\n');
		for (const line of lines) {
			const blockMatch = line.match(/\b(anime|season|episode|movie|special|character|voice_actor|localized_titles|streaming_titles|public_opinion|x-[a-zA-Z][a-zA-Z0-9_-]*)\s*(?:"[^"]*"\s*)?\{/);
			if (blockMatch) {
				blockStack.push(blockMatch[1]);
				braceDepth++;
			}

			const openBraces = (line.match(/\{/g) || []).length;
			const closeBraces = (line.match(/\}/g) || []).length;

			const netClose = closeBraces - (blockMatch ? 1 : openBraces);
			for (let i = 0; i < netClose && blockStack.length > 0; i++) {
				blockStack.pop();
			}
		}

		const currentBlock = blockStack.length > 0 ? blockStack[blockStack.length - 1] : null;

		if (currentBlock) {
			switch (currentBlock) {
				case 'anime':
					context.inAnime = true;
					break;
				case 'season':
					context.inSeason = true;
					break;
				case 'episode':
					context.inEpisode = true;
					break;
				case 'movie':
					context.inMovie = true;
					break;
				case 'special':
					context.inSpecial = true;
					break;
				case 'character':
					context.inCharacter = true;
					break;
				case 'voice_actor':
					context.inVoiceActor = true;
					break;
				case 'localized_titles':
					context.inLocalizedTitles = true;
					break;
				case 'streaming_titles':
					context.inStreamingTitles = true;
					break;
				case 'public_opinion':
					context.inPublicOpinion = true;
					break;
				default:
					if (currentBlock.startsWith('x-')) {
						context.inExtension = true;
					}
			}
		}

		return context;
	}

	private createCompletion(
		label: string,
		detail: string,
		kind: vscode.CompletionItemKind
	): vscode.CompletionItem {
		const item = new vscode.CompletionItem(label, kind);
		item.detail = detail;
		return item;
	}

	private createSnippetCompletion(
		label: string,
		detail: string,
		snippet: string,
		kind: vscode.CompletionItemKind
	): vscode.CompletionItem {
		const item = new vscode.CompletionItem(label, kind);
		item.detail = detail;
		item.insertText = new vscode.SnippetString(snippet);
		return item;
	}

	private createExtensionSnippet(): vscode.CompletionItem {
		return this.createSnippetCompletion(
			'x-extension',
			'Extension property group',
			'x-${1:namespace} {\n\t$0\n}',
			vscode.CompletionItemKind.Struct
		);
	}
}
