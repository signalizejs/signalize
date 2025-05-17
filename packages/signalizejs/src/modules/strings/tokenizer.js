/** @type {import('../../../types/Signalize').Module<import('../../../types/modules/strings/tokenizer').TokenizerModule>} */

/** @typedef {import('../../../types/modules/strings/tokenizer').TokenizerCharSets} TokenizerCharSets */

export default () => {
	/** Class for tokenizing input strings. */
	class Tokenizer {
		/**
		 * @param {string} [input=''] - The input string to tokenize.
		 */
		constructor(input = '') {
			/** @type {string} */
			this.input = '';

			/** @type {TokenizerCharSets} */
			this.charSets = {
				quote: ['"', '`', '\''],
				bracket: ['(', '[', '{', ')', ']', '}'],
				openingBracket: ['(', '[', '{'],
				closingBracket: [')', ']', '}'],
			};

			/** @type {string[]} */
			this.quotes = [];

			/** @type {number} */
			this.cursor = 0;

			/** @type {number} */
			this.line = 1;

			this.setInput(input);
		}

		/**
		 * Sets the input string for the tokenizer.
		 * @param {string} input - The input string.
		 * @returns {this}
		 */
		setInput(input) {
			input = this.normalizeNewLines(input);
			input = this.tabsToSpaces(input);
			this.input = input;
			this.reset();
			return this;
		}

		/**
		 * Gets the remaining input string from the current cursor position.
		 * @returns {string}
		 */
		getRemainingInput() {
			return this.input.slice(this.cursor);
		}

		/**
		 * Retrieves a substring (token) from the input string.
		 * @param {number} start - The starting index.
		 * @param {number} length - The length of the token.
		 * @returns {string}
		 */
		getToken(start, length) {
			if (start < 0 || start >= this.input.length) {
				return '';
			}

			let end = start + length;

			if (end > this.input.length) {
				end = this.input.length;
			}

			return this.input.slice(start, end);
		}

		/**
		 * Retrieves the current token at the cursor position.
		 * @returns {string}
		 */
		getCurrentToken() {
			return this.getToken(this.cursor, 1);
		}

		/**
		 * Retrieves the next token(s) from the cursor position.
		 * @param {number} [length=1] - The number of characters to retrieve.
		 * @returns {string}
		 */
		getNextToken(length = 1) {
			return this.getToken(this.cursor, length);
		}

		/**
		 * Retrieves the previous token(s) relative to the cursor position.
		 * @param {number} back - The number of characters to go back.
		 * @param {number} [length=1] - The number of characters to retrieve.
		 * @returns {string}
		 */
		getPreviousToken(back, length = 1) {
			return this.getToken(this.cursor - back, length);
		}

		/**
		 * Checks if a token is considered whitespace.
		 * @param {string} token - The token to check.
		 * @returns {boolean}
		 */
		isTokenWhitespace(token) {
			return token.trim() === '';
		}

		/**
		 * Checks if a token belongs to a specific character set.
		 * @param {keyof TokenizerCharSets} setName - The name of the character set.
		 * @param {string} token - The token to check.
		 * @returns {boolean}
		 */
		isToken(setName, token) {
			const charSet = this.charSets[setName];

			if (!charSet) {
				throw new Error(`Tokenizer doesn't have set of characters "${setName}"`);
			}

			return charSet.includes(token);
		}

		/**
		 * Updates or defines a new character set.
		 * @param {string} name - The name of the character set.
		 * @param {...string} chars - The characters to include in the set.
		 * @returns {this}
		 */
		setCharsSet(name, ...chars) {
			this.charSets[name] = chars;
			return this;
		}

		/**
		 * Consumes the next token(s) and advances the cursor.
		 * @param {number} [length=1] - The number of characters to consume.
		 * @returns {string}
		 */
		consumeTokens(length = 1) {
			const token = this.getNextToken(length);
			this.cursor += length;
			this.line += (token.match(/\n/g) || []).length;
			return token;
		}

		/**
		 * Checks if there are more tokens to consume.
		 * @returns {boolean}
		 */
		canConsumeTokens() {
			return this.cursor < this.input.length;
		}

		/**
		 * Adjusts the cursor position by a specified offset.
		 * @param {number} position - The offset to adjust the cursor by.
		 * @returns {this}
		 */
		setCursorPosition(position) {
			this.cursor += position;
			return this;
		}

		/**
		 * Resets the line counter to 1.
		 * @returns {this}
		 */
		resetLine() {
			this.line = 1;
			return this;
		}

		/**
		 * Resets the cursor position to the start of the input.
		 * @returns {this}
		 */
		resetCursorPosition() {
			this.cursor = 0;
			return this;
		}

		/**
		 * Resets the tokenizer state (cursor and line).
		 * @returns {this}
		 */
		reset() {
			this.resetCursorPosition();
			this.resetLine();
			return this;
		}

		/**
		 * Normalizes newlines in the input string to `\n`.
		 * @param {string} input - The input string.
		 * @returns {string}
		 */
		normalizeNewLines(input) {
			return input.replace(/\r\n/g, '\n');
		}

		/**
		 * Converts tabs in the input string to spaces.
		 * @param {string} input - The input string.
		 * @returns {string}
		 */
		tabsToSpaces(input) {
			return input.replace(/\t/g, '    ');
		}
	}

	return {
		/**
		 * Factory function to create a new Tokenizer instance.
		 * @param {string} input - The input string.
		 * @returns {Tokenizer}
		 */
		createTokenizer: (input) => new Tokenizer(input),
		Tokenizer,
	};
}
