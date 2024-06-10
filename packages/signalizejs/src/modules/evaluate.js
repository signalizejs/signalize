/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve, globals }) => {
	const { Signal } = await resolve('signal');
	const chunkKeywordMap = {
		undefined,
		true: true,
		false: false,
		null: null,
		Object,
		Boolean,
		Number,
		String,
		Function,
		Array,
		console,
		JSON,
		...globals
	};

	const quotes = ['"', '\'', '`'];
	let operatorsRe;
	let operatorsKeys = [];

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
	/** @type {Record<number, [...Array<string>, CallableFunction][]>} */
	let precedenceOperatorsMap = {
		18: [
			// Groups
			['(', ')', ({ a, chunks, getGroupChunks, index, compile }) => {
				const groupTokens = getGroupChunks(chunks, index, '(', ')');
				const groupTokensLength = groupTokens.length;

				// Check if it the previous argument isnt a function call
				// If it is, skip to the end of the group
				// TODO check group at the beginning of the string
				if (typeof a === 'function' || (a !== undefined && !operatorsKeys.includes(a))) {
					return groupTokensLength + 2;
				}

				return [compile([...allPrecedences], groupTokens), groupTokensLength + 1, index];
			}]
		],
		17: [
			['?.', ({ a, b }) => {
				const chained = a?.[b];
				return [typeof chained === 'function' && chained.prototype === undefined ? chained.bind(a) : chained, 2];
			}],
			['.', ({ a, b }) => {
				const chained = a[b];
				return [typeof chained === 'function' && chained.prototype === undefined ? chained.bind(a) : chained, 2];
			}],
			['[', ']', ({ index, a, chunks, compile, getGroupChunks }) => {
				const args = getGroupChunks(chunks, index, '[', ']');
				const compiledArgs = compile([...allPrecedences], args) ?? [];
				return [a[compiledArgs[0]], 3];
			}],
			// Function call
			['(', ')', ({ index, a, chunks, compile, getGroupChunks }) => {
				const args = getGroupChunks(chunks, index, '(', ')');
				const argsLength = args.length;
				const compiledArgs = compile([...allPrecedences], args) ?? [];
				const applyArgs = Array.isArray(compiledArgs) ? compiledArgs : [compiledArgs];

				if (typeof a !== 'function') {
					throw new Error(`"${a}" is not a function.`);
				}

				let applyResult = a(...applyArgs.flat());

				return [
					typeof applyResult === 'string' ? `\`${applyResult}\`` : applyResult,
					argsLength + 2
				];
			}]
		],
		15: [
			['++', ({ a }) => [a++, 1]],
			['--', ({ a }) => [a--, 1]]
		],
		14: [
			['++', ({ b, index }) => [++b, 1, index]],
			['--', ({ b, index }) => [--b, 1, index]],
			['!', ({ b, index }) => [!b, 1, index]],
			['!!', ({ b, index }) => [!!b, 1, index]],
			['typeof', ({ b, index }) => [typeof b, 1, index]]
		],
		13: [
			['**', ({ a, b }) => [a ** b]],
		],
		12: [
			['*', ({ a, b }) => [a * b]],
			['/', ({ a, b }) => [a / b]],
			['%', ({ a, b }) => [a % b]],
		],
		11: [
			['+', ({ a, b }) => [a + b]],
			['-', ({ a, b }) => [a - b]]
		],
		9: [
			['<', ({ a, b }) => [a < b]],
			['<=', ({ a, b }) => [a <= b]],
			['>', ({ a, b }) => [a > b]],
			['>=', ({ a, b }) => [a >= b]],
			['in', ({ a, b }) => [a in b]],
			['instanceof', ({ a, b }) => [a instanceof b]]
		],
		8: [
			['==', ({ a, b }) => [a == b]],
			['!=', ({ a, b }) => [a != b]],
			['===', ({ a, b }) => [a === b]],
			['!==', ({ a, b }) => [a !== b]]
		],
		7: [
			['&', ({ a, b }) => [a & b]]
		],
		6: [
			['^', ({ a, b }) => [a ^ b]]
		],
		5: [
			['|', ({ a, b }) => [a | b]]
		],
		4: [
			['&&', ({ a, b }) => [a && b]]
		],
		3: [
			['||', ({ a, b }) => [a || b]],
			['??', ({ a, b }) => [a ?? b]]
		],
		2: [
			['?', ':', ({ a, chunks, prepareChunk }) => {
				let b = [];
				let c = [];
				let startIndex = 1;
				let colonFound = false;
				const chunksLength = chunks.length - 1;
				while (startIndex < chunksLength) {
					startIndex += 1;
					const token = chunks[startIndex];
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
						c.push(prepareChunk(chunks[startIndex]));
					} else {
						b.push(prepareChunk(chunks[startIndex]));
					}
				}

				return [a ? b.join('') : c.join(''), b.length + c.length + 2];
			}]
		],
		1: [
			[',', ({ a, b }) => [[...Array.isArray(a) ? a : [a], ...Array.isArray(b) ? b : [b]]]]
		]
	};

	/** @type {Record<number, string[]>} */
	let precedenceOperatorKeysMap = {};
	/** @type {Record<number, Record<string, CallableFunction>>} */
	let precedenceOperatorCompilerMap = {};

	for (const precedence in precedenceOperatorsMap) {
		for (const operatorDefinition of precedenceOperatorsMap[precedence]) {
			const operators = Object.values(operatorDefinition);
			precedenceOperatorKeysMap[precedence] = [
				...precedenceOperatorKeysMap[precedence] ?? [],
				...operators.slice(0, -1)
			];
			precedenceOperatorCompilerMap[precedence] = {
				...precedenceOperatorCompilerMap[precedence],
				[operators[0]]: operators.pop()
			};
		}
	}

	operatorsKeys = Object.values(precedenceOperatorKeysMap).flat();
	operatorsRe = new RegExp(`^(${operatorsKeys
		.map((item) => {
			item = item.replace(/[|+\\/?*^.,(){}$[\]]/g, '\\$&');

			// When the operator is a word like "in", wrap it into the full word match to prevent matching
			// it in words like "increment".
			if (/[\w_]+/.test(item)) {
				item = `\b${item}\b`;
			}

			return item;
		})
		.sort((a, b) => b.length - a.length)
		.join('|')})`
	);

	const allPrecedences = Object.keys(precedenceOperatorsMap).sort((a, b) => b - a);
	const tokenizeCache = {};

	const evaluate = (str, context = {}, trackSignals = false) => {
		const detectedSignals = new Set();
		const signalsUnwatchCallbacks = new Set();

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

				let operatorMatch = inString ? null : str.match(operatorsRe);
				let operatorDetected = operatorMatch !== null;

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
			return [...chunks];
		};

		const compile = (precedences, chunks) => {
			const precedence = precedences.shift();

			const prepareChunk = (chunk) => {
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

				return processedChunk;
			};

			if (precedence === undefined || chunks.length === 1) {
				return chunks.map((item) => prepareChunk(item));
			}

			const operators = precedenceOperatorKeysMap[precedence];

			if (!chunks.some((chunk) => operators.includes(chunk))) {
				return compile(precedences, chunks);
			}

			let startIndex = 0;
			const chunksLength = chunks.length;

			/**
			 * TODO
			 * There will have to be an array as an argument, that will tell the parser, that the token is actually nesting token.
			 * For example. Open token for template literals is "${" and closing "}".
			 * But if there is something lik ${ {} } in the code, then the "{" will not be matched
			 * as an openning/nesting bracket and the "}" will be incorrectly matched as a closing bracket
			 * of the current template literal.
			 *
			 */
			const getGroupChunks = (chunks, cursorIndex, openToken, closeToken) => {
				const groupChunks = [];
				let closingBracesRequired = 1;

				while (closingBracesRequired > 0 || cursorIndex < chunks.length) {
					cursorIndex += 1;
					const token = chunks[cursorIndex];

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

			let runs = 0;

			while (startIndex <= chunksLength && runs <= chunksLength) {
				const token = chunks[startIndex];

				if (operators.includes(token)) {
					const compiler = precedenceOperatorCompilerMap[precedence]?.[token];

					if (compiler === undefined) {
						throw new Error(`Unexpected token "${token}" in ${chunks.join(' ')}`);
					}

					const result = compiler({
						a: prepareChunk(chunks[startIndex - 1]),
						b: prepareChunk(chunks[startIndex + 1]),
						compile,
						prepareChunk,
						getGroupChunks,
						index: startIndex,
						chunks,
						context
					});

					if (typeof result === 'number') {
						startIndex += result;
					} else {
						let resultPosition = result[2] ?? undefined;
						const spliceLength = result[1] ?? 2;

						if (resultPosition === undefined) {
							resultPosition = chunks[startIndex - 1] === undefined ? startIndex : startIndex - 1;
						}

						chunks[resultPosition] = result[0];
						chunks.splice(resultPosition + 1, spliceLength);
					}
				} else {
					startIndex++;
				}

				runs++;
			}

			return compile(precedences, chunks);
		};

		// There is always only one at the end of the evaluation
		const tokens = tokenize(str);
		const result = compile([...allPrecedences], tokens)[0];

		if (result instanceof Signal) {
			detectedSignals.add(result);
		}

		return { result, detectedSignals: [...detectedSignals] };
	};

	return { evaluate };
};
