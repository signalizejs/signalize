/**
 * @returns {import('../Signalize').SignalizePlugin}
 */
export default () => {
	/**
	 * @param {import('../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
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
			JSON,
			...$.globals
		};

		const quotes = ['"', '\'', '`'];
		let operatorsRe;
		let operatorsKeys = [];

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
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
					const spliceLength = args.length;
					const compiledArgs = compile([...allPrecedences], args) ?? [];
					const applyArgs = Array.isArray(compiledArgs) ? compiledArgs : [compiledArgs];
					let applyResult = a(...applyArgs.flat());
					return [
						typeof applyResult === 'string' ? `\`${applyResult}\`` : applyResult,
						spliceLength + 2
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

		let precedenceOperatorKeysMap = {};
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
			.map((item) => item.replace(/[|+\\/?*^.,()[\]]/g, '\\$&'))
			.sort((a, b) => b.length - a.length)
			.join('|')})`
		);
		const allPrecedences = Object.keys(precedenceOperatorsMap).sort((a, b) => b - a);
		const parseCache = {};

		$.evaluate = (str, context = {}, trackSignals = false) => {
			const signalsToWatch = new Set();
			const signalsUnwatchCallbacks = new Set();

			const parse = (str) => {
				const originalString = str;

				if (originalString in parseCache) {
					return [...parseCache[originalString]];
				}

				const chunks = [];
				let inWord = false;
				let inString = false;
				let tokensQueue = '';
				let token = str[0];

				while (token !== undefined) {
					if (!inWord) {
						inWord = tokensQueue.length === 0 && /\w/.test(token);
					} else if (/\W/.test(token) && token !== '_') {
						inWord = false;
					}

					if (quotes.includes(token)) {
						inString = !inString;
					}

					inWord = false;
					let operatorMatch = inWord || inString ? null : str.match(operatorsRe);
					let operatorDetected = !inWord && operatorMatch !== null;

					if (operatorMatch && (
						(/^\w/.test(operatorMatch[0]) && /\w$/.test(tokensQueue))
						|| (/^\w/.test(operatorMatch[0]) && operatorMatch[0] !== operatorMatch.input)
					)) {
						operatorDetected = false;
					}

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

				parseCache[originalString] = chunks;
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
						} else if (!Array.isArray(chunk) && !Number.isNaN(parseFloat(chunk))) {
							processedChunk = parseFloat(chunk);
						} else if (chunk in context) {
							processedChunk = context[chunk];
						}
					}

					if (trackSignals && processedChunk instanceof $.Signal) {
						const unwatch = processedChunk.watch(() => {
							signalsToWatch.add(processedChunk);
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
						const result = precedenceOperatorCompilerMap[precedence][token]({
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
			const result = compile([...allPrecedences], parse(str))[0];

			if (result instanceof $.Signal) {
				signalsToWatch.add(result);
			}

			return { result, signalsToWatch: [...signalsToWatch] };
		};
	};
};
