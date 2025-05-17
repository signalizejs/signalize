/** Represents a set of characters used by the tokenizer. */
export type TokenizerCharSets = Record<string, string[]>;

/** Tokenizer class for processing and analyzing input strings. */
export declare class Tokenizer {
    constructor(input?: string);

    /** The input string being tokenized. */
    input: string;

    /** Character sets used for token classification. */
    charSets: TokenizerCharSets;

    /** Current cursor position in the input string. */
    cursor: number;

    /** Current line number in the input string. */
    line: number;

    /** Sets the input string for the tokenizer. */
    setInput(input: string): this;

    /** Returns the remaining input string from the current cursor position. */
    getRemainingInput(): string;

    /** Retrieves a substring (token) from the input string. */
    getToken(start: number, length: number): string;

    /** Retrieves the current token at the cursor position. */
    getCurrentToken(): string;

    /** Retrieves the next token(s) from the cursor position. */
    getNextToken(length?: number): string;

    /** Retrieves the previous token(s) relative to the cursor position. */
    getPreviousToken(back: number, length?: number): string;

    /** Checks if a token is considered whitespace. */
    isTokenWhitespace(token: string): boolean;

    /** Checks if a token belongs to a specific character set. */
    isToken(setName: keyof TokenizerCharSets, token: string): boolean;

    /** Updates or defines a new character set. */
    setCharsSet(name: string, ...chars: string[]): this;

    /** Consumes the next token(s) and advances the cursor. */
    consumeTokens(length?: number): string;

    /** Checks if there are more tokens to consume. */
    canConsumeTokens(): boolean;

    /** Adjusts the cursor position by a specified offset. */
    setCursorPosition(position: number): this;

    /** Resets the line counter to 1. */
    resetLine(): this;

    /** Resets the cursor position to the start of the input. */
    resetCursorPosition(): this;

    /** Resets the tokenizer state (cursor and line). */
    reset(): this;

    /** Normalizes newlines in the input string to `\n`. */
    normalizeNewLines(input: string): string;

    /** Converts tabs in the input string to spaces. */
    tabsToSpaces(input: string): string;
}

/** Factory function to create a new Tokenizer instance. */
export type CreateTokenizer = (input: string) => Tokenizer;

/** Tokenizer module interface. */
export interface TokenizerModule {
    createTokenizer: CreateTokenizer;
    Tokenizer: typeof Tokenizer;
}
