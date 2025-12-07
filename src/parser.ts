export enum TokenType {
	VersionKeyword,
	AnimeKeyword,
	ResourceKeyword,
	PropertyGroupKeyword,
	ExtensionIdentifier,
	Identifier,
	StringLiteral,
	HeredocStart,
	HeredocContent,
	HeredocEnd,
	DateKeyword,
	NumberLiteral,
	BooleanLiteral,
	Equals,
	OpenBrace,
	CloseBrace,
	OpenBracket,
	CloseBracket,
	OpenParen,
	CloseParen,
	Comma,
	Comment,
	Whitespace,
	Newline,
	EOF,
	Invalid
}

export interface Token {
	type: TokenType;
	value: string;
	line: number;
	column: number;
	endLine: number;
	endColumn: number;
}

export interface Position {
	line: number;
	column: number;
}

export interface Range {
	start: Position;
	end: Position;
}

const RESOURCE_KEYWORDS = ['season', 'episode', 'movie', 'special', 'character', 'voice_actor'];
const PROPERTY_GROUP_KEYWORDS = ['localized_titles', 'streaming_titles', 'public_opinion'];

export class Lexer {
	private source: string;
	private pos: number = 0;
	private line: number = 1;
	private column: number = 1;
	private tokens: Token[] = [];

	constructor(source: string) {
		this.source = source;
	}

	tokenize(): Token[] {
		while (this.pos < this.source.length) {
			this.scanToken();
		}
		this.tokens.push({
			type: TokenType.EOF,
			value: '',
			line: this.line,
			column: this.column,
			endLine: this.line,
			endColumn: this.column
		});
		return this.tokens;
	}

	private scanToken(): void {
		const startLine = this.line;
		const startColumn = this.column;

		const c = this.peek();

		if (c === '\n') {
			this.advance();
			this.tokens.push({
				type: TokenType.Newline,
				value: '\n',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === '\r') {
			this.advance();
			if (this.peek() === '\n') {
				this.advance();
			}
			this.tokens.push({
				type: TokenType.Newline,
				value: '\n',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === ' ' || c === '\t') {
			this.scanWhitespace(startLine, startColumn);
			return;
		}

		if (c === '#') {
			this.scanLineComment(startLine, startColumn);
			return;
		}

		if (c === '/' && this.peekNext() === '/') {
			this.scanLineComment(startLine, startColumn);
			return;
		}

		if (c === '/' && this.peekNext() === '*') {
			this.scanBlockComment(startLine, startColumn);
			return;
		}

		if (c === '"') {
			this.scanString(startLine, startColumn);
			return;
		}

		if (c === '<' && this.peekNext() === '<' && this.peekAt(2) === '<') {
			this.scanHeredoc(startLine, startColumn);
			return;
		}

		if (c === '@') {
			this.scanVersionKeyword(startLine, startColumn);
			return;
		}

		if (this.isAlpha(c)) {
			this.scanIdentifier(startLine, startColumn);
			return;
		}

		if (this.isDigit(c) || (c === '-' && this.isDigit(this.peekNext()))) {
			this.scanNumber(startLine, startColumn);
			return;
		}

		if (c === '=') {
			this.advance();
			this.tokens.push({
				type: TokenType.Equals,
				value: '=',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === '{') {
			this.advance();
			this.tokens.push({
				type: TokenType.OpenBrace,
				value: '{',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === '}') {
			this.advance();
			this.tokens.push({
				type: TokenType.CloseBrace,
				value: '}',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === '[') {
			this.advance();
			this.tokens.push({
				type: TokenType.OpenBracket,
				value: '[',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === ']') {
			this.advance();
			this.tokens.push({
				type: TokenType.CloseBracket,
				value: ']',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === '(') {
			this.advance();
			this.tokens.push({
				type: TokenType.OpenParen,
				value: '(',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === ')') {
			this.advance();
			this.tokens.push({
				type: TokenType.CloseParen,
				value: ')',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		if (c === ',') {
			this.advance();
			this.tokens.push({
				type: TokenType.Comma,
				value: ',',
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
			return;
		}

		this.advance();
		this.tokens.push({
			type: TokenType.Invalid,
			value: c,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private scanWhitespace(startLine: number, startColumn: number): void {
		let value = '';
		while (this.peek() === ' ' || this.peek() === '\t') {
			value += this.advance();
		}
		this.tokens.push({
			type: TokenType.Whitespace,
			value,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private scanLineComment(startLine: number, startColumn: number): void {
		let value = '';
		while (this.peek() !== '\n' && this.pos < this.source.length) {
			value += this.advance();
		}
		this.tokens.push({
			type: TokenType.Comment,
			value,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private scanBlockComment(startLine: number, startColumn: number): void {
		let value = this.advance() + this.advance();
		while (this.pos < this.source.length) {
			if (this.peek() === '*' && this.peekNext() === '/') {
				value += this.advance() + this.advance();
				break;
			}
			value += this.advance();
		}
		this.tokens.push({
			type: TokenType.Comment,
			value,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private scanString(startLine: number, startColumn: number): void {
		let value = this.advance();
		while (this.pos < this.source.length && this.peek() !== '"') {
			if (this.peek() === '\\') {
				value += this.advance();
				if (this.pos < this.source.length) {
					value += this.advance();
				}
			} else if (this.peek() === '\n') {
				break;
			} else {
				value += this.advance();
			}
		}
		if (this.peek() === '"') {
			value += this.advance();
		}
		this.tokens.push({
			type: TokenType.StringLiteral,
			value,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private scanHeredoc(startLine: number, startColumn: number): void {
		this.advance();
		this.advance();
		this.advance();

		let identifier = '';
		while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
			identifier += this.advance();
		}

		while (this.peek() === ' ' || this.peek() === '\t') {
			this.advance();
		}

		if (this.peek() === '\r') {
			this.advance();
		}
		if (this.peek() === '\n') {
			this.advance();
		}

		this.tokens.push({
			type: TokenType.HeredocStart,
			value: '<<<' + identifier,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});

		let content = '';
		const contentStartLine = this.line;
		const contentStartColumn = this.column;

		while (this.pos < this.source.length) {
			if (this.column === 1) {
				let lookahead = '';
				let tempPos = this.pos;
				while (tempPos < this.source.length && this.source[tempPos] !== '\n' && this.source[tempPos] !== '\r') {
					lookahead += this.source[tempPos];
					tempPos++;
				}
				const trimmed = lookahead.trimEnd();
				if (trimmed === identifier) {
					break;
				}
			}
			content += this.advance();
		}

		if (content.length > 0) {
			this.tokens.push({
				type: TokenType.HeredocContent,
				value: content,
				line: contentStartLine,
				column: contentStartColumn,
				endLine: this.line,
				endColumn: this.column
			});
		}

		const endStartLine = this.line;
		const endStartColumn = this.column;
		let endValue = '';
		while (this.pos < this.source.length && this.peek() !== '\n' && this.peek() !== '\r') {
			endValue += this.advance();
		}

		this.tokens.push({
			type: TokenType.HeredocEnd,
			value: endValue.trim(),
			line: endStartLine,
			column: endStartColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private scanVersionKeyword(startLine: number, startColumn: number): void {
		let value = this.advance();
		while (this.isAlphaNumeric(this.peek())) {
			value += this.advance();
		}
		if (value === '@version') {
			this.tokens.push({
				type: TokenType.VersionKeyword,
				value,
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
		} else {
			this.tokens.push({
				type: TokenType.Invalid,
				value,
				line: startLine,
				column: startColumn,
				endLine: this.line,
				endColumn: this.column
			});
		}
	}

	private scanIdentifier(startLine: number, startColumn: number): void {
		let value = '';
		while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-') {
			value += this.advance();
		}

		let type: TokenType;
		if (value === 'anime') {
			type = TokenType.AnimeKeyword;
		} else if (RESOURCE_KEYWORDS.includes(value)) {
			type = TokenType.ResourceKeyword;
		} else if (PROPERTY_GROUP_KEYWORDS.includes(value)) {
			type = TokenType.PropertyGroupKeyword;
		} else if (value === 'date') {
			type = TokenType.DateKeyword;
		} else if (value === 'true' || value === 'false') {
			type = TokenType.BooleanLiteral;
		} else if (value.startsWith('x-')) {
			type = TokenType.ExtensionIdentifier;
		} else {
			type = TokenType.Identifier;
		}

		this.tokens.push({
			type,
			value,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private scanNumber(startLine: number, startColumn: number): void {
		let value = '';
		if (this.peek() === '-') {
			value += this.advance();
		}
		while (this.isDigit(this.peek())) {
			value += this.advance();
		}
		if (this.peek() === '.' && this.isDigit(this.peekNext())) {
			value += this.advance();
			while (this.isDigit(this.peek())) {
				value += this.advance();
			}
		}
		this.tokens.push({
			type: TokenType.NumberLiteral,
			value,
			line: startLine,
			column: startColumn,
			endLine: this.line,
			endColumn: this.column
		});
	}

	private peek(): string {
		if (this.pos >= this.source.length) return '\0';
		return this.source[this.pos];
	}

	private peekNext(): string {
		if (this.pos + 1 >= this.source.length) return '\0';
		return this.source[this.pos + 1];
	}

	private peekAt(offset: number): string {
		if (this.pos + offset >= this.source.length) return '\0';
		return this.source[this.pos + offset];
	}

	private advance(): string {
		const c = this.source[this.pos++];
		if (c === '\n') {
			this.line++;
			this.column = 1;
		} else {
			this.column++;
		}
		return c;
	}

	private isAlpha(c: string): boolean {
		return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
	}

	private isDigit(c: string): boolean {
		return c >= '0' && c <= '9';
	}

	private isAlphaNumeric(c: string): boolean {
		return this.isAlpha(c) || this.isDigit(c);
	}
}

export interface ASTNode {
	type: string;
	range: Range;
}

export interface VersionDeclaration extends ASTNode {
	type: 'VersionDeclaration';
	version: string;
}

export interface AnimeResource extends ASTNode {
	type: 'AnimeResource';
	id: string;
	properties: Property[];
	propertyGroups: PropertyGroup[];
	extensionGroups: ExtensionGroup[];
	resources: Resource[];
}

export interface Resource extends ASTNode {
	type: 'Resource';
	resourceType: string;
	id: string;
	properties: Property[];
	propertyGroups: PropertyGroup[];
	extensionGroups: ExtensionGroup[];
	resources: Resource[];
}

export interface PropertyGroup extends ASTNode {
	type: 'PropertyGroup';
	groupType: string;
	properties: Property[];
}

export interface ExtensionGroup extends ASTNode {
	type: 'ExtensionGroup';
	name: string;
	properties: Property[];
	propertyGroups: PropertyGroup[];
}

export interface Property extends ASTNode {
	type: 'Property';
	name: string;
	value: PropertyValue;
	nameRange: Range;
}

export type PropertyValue = StringValue | NumberValue | BooleanValue | DateValue | ArrayValue | HeredocValue;

export interface StringValue extends ASTNode {
	type: 'StringValue';
	value: string;
	raw: string;
}

export interface NumberValue extends ASTNode {
	type: 'NumberValue';
	value: number;
	raw: string;
}

export interface BooleanValue extends ASTNode {
	type: 'BooleanValue';
	value: boolean;
}

export interface DateValue extends ASTNode {
	type: 'DateValue';
	value: string;
	raw: string;
}

export interface ArrayValue extends ASTNode {
	type: 'ArrayValue';
	elements: PropertyValue[];
}

export interface HeredocValue extends ASTNode {
	type: 'HeredocValue';
	value: string;
	identifier: string;
}

export interface File extends ASTNode {
	type: 'File';
	version: VersionDeclaration | null;
	animes: AnimeResource[];
}

export interface ParseError {
	message: string;
	range: Range;
}

export class Parser {
	private tokens: Token[];
	private pos: number = 0;
	private errors: ParseError[] = [];

	constructor(tokens: Token[]) {
		this.tokens = tokens.filter(t =>
			t.type !== TokenType.Whitespace &&
			t.type !== TokenType.Comment &&
			t.type !== TokenType.Newline
		);
	}

	parse(): { ast: File; errors: ParseError[] } {
		const startToken = this.peek();
		let version: VersionDeclaration | null = null;
		const animes: AnimeResource[] = [];

		if (this.check(TokenType.VersionKeyword)) {
			version = this.parseVersionDeclaration();
		}

		while (!this.isAtEnd()) {
			if (this.check(TokenType.AnimeKeyword)) {
				const anime = this.parseAnimeResource();
				if (anime) {
					animes.push(anime);
				}
			} else {
				const token = this.peek();
				this.errors.push({
					message: `Expected 'anime' keyword, found '${token.value}'`,
					range: this.tokenRange(token)
				});
				this.advance();
			}
		}

		const endToken = this.tokens[this.tokens.length - 1];
		return {
			ast: {
				type: 'File',
				version,
				animes,
				range: {
					start: { line: startToken.line, column: startToken.column },
					end: { line: endToken.endLine, column: endToken.endColumn }
				}
			},
			errors: this.errors
		};
	}

	private parseVersionDeclaration(): VersionDeclaration | null {
		const startToken = this.advance();
		if (!this.check(TokenType.StringLiteral)) {
			this.errors.push({
				message: 'Expected version string after @version',
				range: this.tokenRange(startToken)
			});
			return null;
		}
		const versionToken = this.advance();
		const version = this.parseStringValue(versionToken.value);
		return {
			type: 'VersionDeclaration',
			version,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: versionToken.endLine, column: versionToken.endColumn }
			}
		};
	}

	private parseAnimeResource(): AnimeResource | null {
		const startToken = this.advance();
		if (!this.check(TokenType.StringLiteral)) {
			this.errors.push({
				message: 'Expected anime identifier string',
				range: this.tokenRange(startToken)
			});
			return null;
		}
		const idToken = this.advance();
		const id = this.parseStringValue(idToken.value);

		if (!this.check(TokenType.OpenBrace)) {
			this.errors.push({
				message: "Expected '{' after anime identifier",
				range: this.tokenRange(this.peek())
			});
			return null;
		}
		this.advance();

		const { properties, propertyGroups, extensionGroups, resources, endToken } = this.parseBlock();

		return {
			type: 'AnimeResource',
			id,
			properties,
			propertyGroups,
			extensionGroups,
			resources,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: endToken.endLine, column: endToken.endColumn }
			}
		};
	}

	private parseResource(): Resource | null {
		const startToken = this.advance();
		const resourceType = startToken.value;

		if (!this.check(TokenType.StringLiteral)) {
			this.errors.push({
				message: `Expected ${resourceType} identifier string`,
				range: this.tokenRange(startToken)
			});
			return null;
		}
		const idToken = this.advance();
		const id = this.parseStringValue(idToken.value);

		if (!this.check(TokenType.OpenBrace)) {
			this.errors.push({
				message: `Expected '{' after ${resourceType} identifier`,
				range: this.tokenRange(this.peek())
			});
			return null;
		}
		this.advance();

		const { properties, propertyGroups, extensionGroups, resources, endToken } = this.parseBlock();

		return {
			type: 'Resource',
			resourceType,
			id,
			properties,
			propertyGroups,
			extensionGroups,
			resources,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: endToken.endLine, column: endToken.endColumn }
			}
		};
	}

	private parsePropertyGroup(): PropertyGroup | null {
		const startToken = this.advance();
		const groupType = startToken.value;

		if (!this.check(TokenType.OpenBrace)) {
			this.errors.push({
				message: `Expected '{' after ${groupType}`,
				range: this.tokenRange(this.peek())
			});
			return null;
		}
		this.advance();

		const properties: Property[] = [];
		while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
			if (this.check(TokenType.Identifier)) {
				const prop = this.parseProperty();
				if (prop) {
					properties.push(prop);
				}
			} else {
				const token = this.peek();
				this.errors.push({
					message: `Unexpected token '${token.value}' in property group`,
					range: this.tokenRange(token)
				});
				this.advance();
			}
		}

		let endToken = this.peek();
		if (this.check(TokenType.CloseBrace)) {
			endToken = this.advance();
		} else {
			this.errors.push({
				message: `Expected '}' to close ${groupType}`,
				range: this.tokenRange(endToken)
			});
		}

		return {
			type: 'PropertyGroup',
			groupType,
			properties,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: endToken.endLine, column: endToken.endColumn }
			}
		};
	}

	private parseExtensionGroup(): ExtensionGroup | null {
		const startToken = this.advance();
		const name = startToken.value;

		if (!this.check(TokenType.OpenBrace)) {
			this.errors.push({
				message: `Expected '{' after ${name}`,
				range: this.tokenRange(this.peek())
			});
			return null;
		}
		this.advance();

		const properties: Property[] = [];
		const propertyGroups: PropertyGroup[] = [];

		while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
			if (this.check(TokenType.PropertyGroupKeyword)) {
				const group = this.parsePropertyGroup();
				if (group) {
					propertyGroups.push(group);
				}
			} else if (this.check(TokenType.ExtensionIdentifier)) {
				const token = this.peek();
				this.errors.push({
					message: 'Nested extension groups are not allowed',
					range: this.tokenRange(token)
				});
				this.advance();
				if (this.check(TokenType.OpenBrace)) {
					this.skipBlock();
				}
			} else if (this.check(TokenType.Identifier)) {
				const prop = this.parseProperty();
				if (prop) {
					properties.push(prop);
				}
			} else {
				const token = this.peek();
				this.errors.push({
					message: `Unexpected token '${token.value}' in extension group`,
					range: this.tokenRange(token)
				});
				this.advance();
			}
		}

		let endToken = this.peek();
		if (this.check(TokenType.CloseBrace)) {
			endToken = this.advance();
		} else {
			this.errors.push({
				message: `Expected '}' to close ${name}`,
				range: this.tokenRange(endToken)
			});
		}

		return {
			type: 'ExtensionGroup',
			name,
			properties,
			propertyGroups,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: endToken.endLine, column: endToken.endColumn }
			}
		};
	}

	private parseBlock(): {
		properties: Property[];
		propertyGroups: PropertyGroup[];
		extensionGroups: ExtensionGroup[];
		resources: Resource[];
		endToken: Token;
	} {
		const properties: Property[] = [];
		const propertyGroups: PropertyGroup[] = [];
		const extensionGroups: ExtensionGroup[] = [];
		const resources: Resource[] = [];

		while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
			if (this.check(TokenType.ResourceKeyword)) {
				const resource = this.parseResource();
				if (resource) {
					resources.push(resource);
				}
			} else if (this.check(TokenType.PropertyGroupKeyword)) {
				const group = this.parsePropertyGroup();
				if (group) {
					propertyGroups.push(group);
				}
			} else if (this.check(TokenType.ExtensionIdentifier)) {
				const ext = this.parseExtensionGroup();
				if (ext) {
					extensionGroups.push(ext);
				}
			} else if (this.check(TokenType.Identifier)) {
				const prop = this.parseProperty();
				if (prop) {
					properties.push(prop);
				}
			} else {
				const token = this.peek();
				this.errors.push({
					message: `Unexpected token '${token.value}'`,
					range: this.tokenRange(token)
				});
				this.advance();
			}
		}

		let endToken = this.peek();
		if (this.check(TokenType.CloseBrace)) {
			endToken = this.advance();
		} else {
			this.errors.push({
				message: "Expected '}'",
				range: this.tokenRange(endToken)
			});
		}

		return { properties, propertyGroups, extensionGroups, resources, endToken };
	}

	private parseProperty(): Property | null {
		const nameToken = this.advance();
		const nameRange: Range = {
			start: { line: nameToken.line, column: nameToken.column },
			end: { line: nameToken.endLine, column: nameToken.endColumn }
		};

		if (!this.check(TokenType.Equals)) {
			this.errors.push({
				message: `Expected '=' after property name '${nameToken.value}'`,
				range: this.tokenRange(this.peek())
			});
			return null;
		}
		this.advance();

		const value = this.parseValue();
		if (!value) {
			return null;
		}

		return {
			type: 'Property',
			name: nameToken.value,
			value,
			nameRange,
			range: {
				start: { line: nameToken.line, column: nameToken.column },
				end: value.range.end
			}
		};
	}

	private parseValue(): PropertyValue | null {
		const token = this.peek();

		if (this.check(TokenType.StringLiteral)) {
			const t = this.advance();
			const value = this.parseStringValue(t.value);
			return {
				type: 'StringValue',
				value,
				raw: t.value,
				range: this.tokenRange(t)
			};
		}

		if (this.check(TokenType.HeredocStart)) {
			return this.parseHeredocValue();
		}

		if (this.check(TokenType.NumberLiteral)) {
			const t = this.advance();
			return {
				type: 'NumberValue',
				value: parseFloat(t.value),
				raw: t.value,
				range: this.tokenRange(t)
			};
		}

		if (this.check(TokenType.BooleanLiteral)) {
			const t = this.advance();
			return {
				type: 'BooleanValue',
				value: t.value === 'true',
				range: this.tokenRange(t)
			};
		}

		if (this.check(TokenType.DateKeyword)) {
			return this.parseDateValue();
		}

		if (this.check(TokenType.OpenBracket)) {
			return this.parseArrayValue();
		}

		this.errors.push({
			message: `Expected value, found '${token.value}'`,
			range: this.tokenRange(token)
		});
		this.advance();
		return null;
	}

	private parseHeredocValue(): HeredocValue | null {
		const startToken = this.advance();
		const identifier = startToken.value.substring(3);

		let content = '';
		let contentToken: Token | null = null;
		if (this.check(TokenType.HeredocContent)) {
			contentToken = this.advance();
			content = contentToken.value;
		}

		let endToken = this.peek();
		if (this.check(TokenType.HeredocEnd)) {
			endToken = this.advance();
		} else {
			this.errors.push({
				message: `Expected heredoc terminator '${identifier}'`,
				range: this.tokenRange(endToken)
			});
		}

		const processedContent = this.processHeredocContent(content);

		return {
			type: 'HeredocValue',
			value: processedContent,
			identifier,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: endToken.endLine, column: endToken.endColumn }
			}
		};
	}

	private processHeredocContent(content: string): string {
		const lines = content.split('\n');
		if (lines.length > 0 && lines[lines.length - 1] === '') {
			lines.pop();
		}

		const nonEmptyLines = lines.filter(line => line.trim().length > 0);
		if (nonEmptyLines.length === 0) {
			return content;
		}

		let minIndent = Infinity;
		for (const line of nonEmptyLines) {
			const match = line.match(/^(\s*)/);
			if (match) {
				minIndent = Math.min(minIndent, match[1].length);
			}
		}

		if (minIndent === Infinity || minIndent === 0) {
			return lines.join('\n');
		}

		return lines.map(line => {
			if (line.trim().length === 0) {
				return '';
			}
			return line.substring(minIndent);
		}).join('\n');
	}

	private parseDateValue(): DateValue | null {
		const startToken = this.advance();

		if (!this.check(TokenType.OpenParen)) {
			this.errors.push({
				message: "Expected '(' after 'date'",
				range: this.tokenRange(this.peek())
			});
			return null;
		}
		this.advance();

		if (!this.check(TokenType.StringLiteral)) {
			this.errors.push({
				message: 'Expected date string in ISO 8601 format',
				range: this.tokenRange(this.peek())
			});
			return null;
		}
		const dateToken = this.advance();
		const dateValue = this.parseStringValue(dateToken.value);

		let endToken = this.peek();
		if (!this.check(TokenType.CloseParen)) {
			this.errors.push({
				message: "Expected ')' after date string",
				range: this.tokenRange(this.peek())
			});
		} else {
			endToken = this.advance();
		}

		return {
			type: 'DateValue',
			value: dateValue,
			raw: dateToken.value,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: endToken.endLine, column: endToken.endColumn }
			}
		};
	}

	private parseArrayValue(): ArrayValue | null {
		const startToken = this.advance();
		const elements: PropertyValue[] = [];

		while (!this.check(TokenType.CloseBracket) && !this.isAtEnd()) {
			const value = this.parseValue();
			if (value) {
				elements.push(value);
			}

			if (this.check(TokenType.Comma)) {
				this.advance();
			} else if (!this.check(TokenType.CloseBracket)) {
				break;
			}
		}

		let endToken = this.peek();
		if (this.check(TokenType.CloseBracket)) {
			endToken = this.advance();
		} else {
			this.errors.push({
				message: "Expected ']' to close array",
				range: this.tokenRange(endToken)
			});
		}

		return {
			type: 'ArrayValue',
			elements,
			range: {
				start: { line: startToken.line, column: startToken.column },
				end: { line: endToken.endLine, column: endToken.endColumn }
			}
		};
	}

	private parseStringValue(raw: string): string {
		if (raw.length < 2) return '';
		const inner = raw.slice(1, -1);
		return inner
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, '\\')
			.replace(/\\n/g, '\n')
			.replace(/\\t/g, '\t')
			.replace(/\\r/g, '\r')
			.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
			.replace(/\\U([0-9a-fA-F]{8})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
	}

	private skipBlock(): void {
		let depth = 1;
		this.advance();
		while (depth > 0 && !this.isAtEnd()) {
			if (this.check(TokenType.OpenBrace)) {
				depth++;
			} else if (this.check(TokenType.CloseBrace)) {
				depth--;
			}
			this.advance();
		}
	}

	private tokenRange(token: Token): Range {
		return {
			start: { line: token.line, column: token.column },
			end: { line: token.endLine, column: token.endColumn }
		};
	}

	private peek(): Token {
		return this.tokens[this.pos];
	}

	private advance(): Token {
		if (!this.isAtEnd()) {
			this.pos++;
		}
		return this.tokens[this.pos - 1];
	}

	private check(type: TokenType): boolean {
		if (this.isAtEnd()) return false;
		return this.peek().type === type;
	}

	private isAtEnd(): boolean {
		return this.peek().type === TokenType.EOF;
	}
}

export function parse(source: string): { ast: File; errors: ParseError[] } {
	const lexer = new Lexer(source);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	return parser.parse();
}
