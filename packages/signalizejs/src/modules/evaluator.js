/** @type {import('../../types/Signalize').Module<import('../../types/modules/evaluator').EvaluatorModule>} */
export default async ({ resolve, globals }) => {
	const { Signal } = await resolve('signal');

	/** @typedef {Record<string, any>} Context */

	/** @typedef {Object} Chunk
	 * @property {any} value - The value of the chunk.
	 */

	/** @typedef {Object} EvaluationResult
	 * @property {any} result - The final result of the evaluation.
	 * @property {Signal[]} detectedSignals - Signals detected during evaluation.
	 */

	class Chunk {
		#value;

		get value() {
			return this.#value;
		}

		set value(newValue) {
			if (newValue instanceof Chunk) {
				throw new Error('Chunk cannot be a Chunk');
			}

			if (Array.isArray(newValue) && newValue.some(item => item instanceof Chunk)) {
				throw new Error('Chunk cannot contain an array with a Chunk');
			}

			this.#value = newValue;
		}
		/**
		 * @param {any} value - The value of the chunk.
		 */
		constructor(value) {
			this.#value = value;
		}
	}

	const chunkKeywordMap = {
		undefined,
		true: true,
		false: false,
		null: null,
		Object,
		Boolean,
		Number,
		String,
		Array,
		console,
		JSON,
		...globals
	};

	const quotes = ['"', '\'', '`'];

	/** @type {Record<number, [...Array<string>, (args: { a: Chunk, b: Chunk, compile: (chunks: Chunk[]) => Chunk[], prepareChunk: (chunk: any) => Chunk, getGroupChunks: (chunks: Chunk[], cursorIndex: number, openToken: string, closeToken: string) => Chunk[], cursor: number, chunks: Chunk[], context: Context }) => any][]>} */
	const precedenceOperatorsMap = {
		18: [
			// Groups
			['(', ')', ({ a, chunks, getGroupChunks, cursor, compile }) => {
				const groupTokens = getGroupChunks(chunks, cursor, '(', ')');
				const groupTokensLength = groupTokens.length;

				// Check if it the previous argument isnt a function call
				// If it is, skip to the end of the group
				// TODO check group at the beginning of the string
				if (typeof a.value === 'function' || (a.value !== undefined && !operatorsKeys.includes(a.value))) {
					return groupTokensLength + 2;
				}

				return [compile(groupTokens), groupTokensLength + 1, cursor];
			}]
		],
		17: [
			['?.', ({ a, b }) => {
				const chained = a.value?.[b.value];
				return [typeof chained === 'function' && chained.prototype === undefined ? chained.bind(a.value) : chained, 2];
			}],
			['.', ({ a, b }) => {
				const chained = a.value[b.value];
				return [typeof chained === 'function' && chained.prototype === undefined ? chained.bind(a.value) : chained, 2];
			}],
			['[', ']', ({ cursor, a, chunks, compile, getGroupChunks }) => {
				const args = getGroupChunks(chunks, cursor, '[', ']');
				const compiledArgs = compile(args) ?? [];
				return [a.value[compiledArgs[0].value], 3];
			}],
			// Function call
			['(', ')', ({ cursor, a, chunks, compile, getGroupChunks }) => {
				const args = getGroupChunks(chunks, cursor, '(', ')');
				const argsLength = args.length;
				const compiledArgs = compile(args) ?? [];
				const applyArgs = (Array.isArray(compiledArgs) ? compiledArgs : [compiledArgs]).map((chunk) => chunk.value);

				if (typeof a.value !== 'function') {
					throw new Error(`"${a.value}" is not a function.`);
				}

				const applyResult = a.value(...applyArgs.flat());

				return [
					typeof applyResult === 'string' ? `\`${applyResult}\`` : applyResult,
					argsLength + 2
				];
			}]
		],
		15: [
			['++', ({ a }) => [a.value++, 1]],
			['--', ({ a }) => [a.value--, 1]]
		],
		14: [
			['++', ({ b, cursor }) => [++b.value, 1, cursor]],
			['--', ({ b, cursor }) => [--b.value, 1, cursor]],
			['!', ({ b, cursor }) => [!b.value, 1, cursor]],
			['!!', ({ b, cursor }) => [!!b.value, 1, cursor]],
			['typeof', ({ b, cursor }) => [typeof b.value, 1, cursor]]
		],
		13: [
			['**', ({ a, b }) => [a.value ** b.value]],
		],
		12: [
			['*', ({ a, b }) => [a.value * b.value]],
			['/', ({ a, b }) => [a.value / b.value]],
			['%', ({ a, b }) => [a.value % b.value]],
		],
		11: [
			['+', ({ a, b }) => [a.value + b.value]],
			['-', ({ a, b }) => [a.value - b.value]]
		],
		9: [
			['<', ({ a, b }) => [a.value < b.value]],
			['<=', ({ a, b }) => [a.value <= b.value]],
			['>', ({ a, b }) => [a.value > b.value]],
			['>=', ({ a, b }) => [a.value >= b.value]],
			['in', ({ a, b }) => [a.value in b.value]],
			['instanceof', ({ a, b }) => [a.value instanceof b.value]]
		],
		8: [
			['==', ({ a, b }) => [a.value == b.value]],
			['!=', ({ a, b }) => [a.value != b.value]],
			['===', ({ a, b }) => [a.value === b.value]],
			['!==', ({ a, b }) => [a.value !== b.value]]
		],
		7: [
			['&', ({ a, b }) => [a.value & b.value]]
		],
		6: [
			['^', ({ a, b }) => [a.value ^ b.value]]
		],
		5: [
			['|', ({ a, b }) => [a.value | b.value]]
		],
		4: [
			['&&', ({ a, b }) => [a.value && b.value]]
		],
		3: [
			['||', ({ a, b }) => [a.value || b.value]],
			['??', ({ a, b }) => [a.value ?? b.value]]
		],
		2: [
			['?', ':', ({ a, chunks, compile }) => {
				const b = [];
				const c = [];
				let startIndex = 1;
				let colonFound = false;
				const chunksLength = chunks.length - 1;

				while (startIndex < chunksLength) {
					startIndex += 1;
					const token = chunks[startIndex].value;
					const isColon = token === ':';

					if (!colonFound) {
						colonFound = isColon;
						if (colonFound) {
							continue;
						}
					}

					if (!isColon && operatorsKeys.includes(token)) {
						break;
					}

					if (colonFound) {
						c.push(chunks[startIndex]);
					} else {
						b.push(chunks[startIndex]);
					}
				}

				return [a.value ? compile(b)[0] : compile(c)[0], b.length + c.length + 2];
			}]
		],
		1: [
			[',', ({ a, b }) => [[...Array.isArray(a.value) ? a.value : [a.value], ...Array.isArray(b.value) ? b.value : [b.value]]]]
		]
	};

	/** @type {Record<number, string[]>} */
	const precedenceOperatorKeysMap = {};
	/** @type {Record<number, Record<string, CallableFunction>>} */
	const precedenceOperatorCompilerMap = {};

	for (const precedence in precedenceOperatorsMap) {
		for (const operatorDefinition of precedenceOperatorsMap[precedence]) {
			const operators = Object.values(operatorDefinition);
			precedenceOperatorKeysMap[precedence] = [
				...(precedenceOperatorKeysMap[precedence] ?? []),
				...operators.slice(0, -1)
			];
			precedenceOperatorCompilerMap[precedence] = {
				...(precedenceOperatorCompilerMap[precedence] ?? {}),
				[operators[0]]: operators.pop()
			};
		}
	}

	const operatorsKeys = Object.values(precedenceOperatorKeysMap).flat();
	const operatorsRe = new RegExp(`^(${operatorsKeys
		.map((item) => {
			item = item.replace(/[|+\\/?*^.,(){}$[\]]/g, '\\$&');
			if (/[\w_]+/.test(item)) {
				item = `\b${item}\b`;
			}
			return item;
		})
		.sort((a, b) => b.length - a.length)
		.join('|')})`
	);

	const allPrecedences = Object.keys(precedenceOperatorsMap).map((key) => Number(key)).sort((a, b) => b - a);
	const tokenizeCache = {};

	/**
	 * Evaluates a string expression within a given context.
	 * @param {string} str - The string to evaluate.
	 * @param {Context} [context={}] - The context for evaluation.
	 * @param {boolean} [trackSignals=false] - Whether to track signals during evaluation.
	 * @returns {EvaluationResult}
	 */
	const evaluate = (str, context = {}, trackSignals = false) => {
		const detectedSignals = new Set();
		const signalsUnwatchCallbacks = new Set();

		/**
		 * Tokenizes a string into chunks.
		 * @param {string} str - The string to tokenize.
		 * @returns {string[]}
		 */
		const tokenize = (str) => {
			const originalString = str;

			if (originalString in tokenizeCache) {
				return [...tokenizeCache[originalString]];
			}

			const chunks = [];
			let inString = false;
			let tokensQueue = '';
			let token = str[0];

			while (token !== undefined) {
				if (quotes.includes(token)) {
					inString = !inString;
				}

				const operatorMatch = inString ? null : str.match(operatorsRe);
				const operatorDetected = operatorMatch !== null;

				str = str.slice(operatorDetected ? operatorMatch[0].length : 1);
				if (operatorDetected) {
					if (tokensQueue.trim().length) {
						chunks.push(tokensQueue.trim());
						tokensQueue = '';
					}

					chunks.push(operatorMatch[0]);
				} else {
					tokensQueue += token;
				}

				if (str.length === 0 && tokensQueue.trim().length) {
					chunks.push(tokensQueue.trim());
				}

				token = str[0];
			}

			tokenizeCache[originalString] = chunks;
			return chunks;
		};

		/**
		 * Prepares a chunk for evaluation.
		 * @param {any} chunk - The chunk to prepare.
		 * @returns {Chunk}
		 */
		const prepareChunk = (chunk) => {
			if (chunk instanceof Chunk) {
				return chunk;
			}

			let processedChunk = chunk;

			if (typeof chunk !== 'function') {
				if (quotes.includes(chunk?.[0])) {
					processedChunk = String(chunk.substring(1).substring(0, chunk.length - 2));
				} else if (chunk in chunkKeywordMap) {
					processedChunk = chunkKeywordMap[chunk];
				} else if (!Array.isArray(chunk) && /^\d+(?:\.\d+)?$/.test(chunk)) {
					processedChunk = parseFloat(chunk);
				} else if (chunk in context) {
					processedChunk = context[chunk];
				}
			}

			if (trackSignals && processedChunk instanceof Signal) {
				const unwatch = processedChunk.watch(() => {
					detectedSignals.add(processedChunk);
				}, { execution: 'onGet' });

				signalsUnwatchCallbacks.add(unwatch);
			}

			return new Chunk(processedChunk);
		};

		/**
		 * Extracts group chunks based on opening and closing tokens.
		 * @param {Chunk[]} chunks - The chunks to process.
		 * @param {number} cursorIndex - The current cursor index.
		 * @param {string} openToken - The opening token.
		 * @param {string} closeToken - The closing token.
		 * @returns {Chunk[]}
		 */
		const getGroupChunks = (chunks, cursorIndex, openToken, closeToken) => {
			const groupChunks = [];
			let closingBracesRequired = 1;

			while (closingBracesRequired > 0 || cursorIndex < chunks.length) {
				cursorIndex += 1;
				const token = chunks[cursorIndex].value

				if (token === openToken) {
					closingBracesRequired++;
				}

				if (token === closeToken) {
					closingBracesRequired--;
				}

				if (closingBracesRequired === 0) {
					break;
				}

				groupChunks.push(chunks[cursorIndex]);
			}

			return groupChunks;
		};

		/**
		 * Compiles chunks into a final result.
		 * @param {Chunk[]} chunks - The chunks to compile.
		 * @returns {Chunk[]}
		 */
		const compile = (chunks) => {
			chunks = [...chunks].map((item) => prepareChunk(item));

			for (const precedence of allPrecedences) {
				let cursor = 0;
				if (cursor > chunks.length) {
					break;
				}

				while (cursor < chunks.length) {
					if (chunks[cursor] === undefined) {
						cursor++;
						continue;
					}

					const token = chunks[cursor].value;
					const compiler = precedenceOperatorCompilerMap[precedence]?.[token];

					if (compiler === undefined) {
						cursor++;
						continue;
					}

					const result = compiler({
						a: prepareChunk(chunks[cursor - 1]),
						b: prepareChunk(chunks[cursor + 1]),
						compile,
						prepareChunk,
						getGroupChunks,
						cursor,
						chunks,
						context
					});

					let consumedCharacters = 2;
					let resultPosition = cursor - 1;

					if (typeof result === 'number') {
						resultPosition += result;
					} else {
						let resultPosition = result[2] ?? undefined;
						if (result[1] !== undefined) {
							consumedCharacters = result[1];
						}

						if (resultPosition === undefined) {
							resultPosition = chunks[cursor - 1] === undefined ? cursor : cursor - 1;
						}

						chunks[resultPosition] = prepareChunk(result[0]);
						chunks.splice(resultPosition + 1, consumedCharacters);
					}

					cursor = resultPosition + 1;
				}
			}

			return chunks;
		};

		// Tokenize and compile the input string
		const tokens = tokenize(str);
		const result = compile(tokens).map((chunk) => {
			const prepared = prepareChunk(chunk).value

			if (prepared instanceof Signal) {
				detectedSignals.add(prepared);
			}

			return prepared;
		});

		return {
			result: result.length > 1 ? result : result[0],
			detectedSignals: [...detectedSignals]
		};
	};

	return { evaluate };
};
