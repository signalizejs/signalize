import type { Signalize } from '..';

export default () => {
	return ($: Signalize) => {
		const chunkKeywordMap = {
			undefined,
			true: true,
			false: false,
			null: null,
			...$.globals,
			Object,
			Boolean,
			Number,
			String,
			Function,
			Array,
			JSON
		}
		const quotes = ['"', "'", '`'];

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
		let precedenceOperatorsMap = {
			18: [
				['(', ')', ({ a, chunks, getGroupChunks, index, compile }) => {
					const groupTokens = getGroupChunks(chunks, index, '(', ')');
					const groupTokensLength = groupTokens.length;

					if (!/^(?:\s|\W)/.test(a.toString())) {
						return groupTokensLength + 2;
					}

					return [compile([...allPrecedences], groupTokens), groupTokensLength + 1, index]
				}]
			],
			17: [
				['?.', ({ a, b }) => [a?.[b], 2]],
				['.', ({ a, b }) => [a[b], 2]],
				['(', ')', ({ index, a, chunks, compile, getGroupChunks }) => {
					const args = getGroupChunks(chunks, index, '(', ')');
					const spliceLength = args.length;
					console.log(args);
					const compiledArgs = compile([...allPrecedences], args) ?? [];
					const applyArgs = Array.isArray(compiledArgs) ? compiledArgs : [compiledArgs];

					return [
						a.apply(undefined, applyArgs.flat()),
						spliceLength + 2
					]
				}]
			],
			15: [
				['++.', ({ a }) => [a++, 1]],
				['--.', ({ a }) => [a--, 1]]
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
				['in', ({ a, b }) => [[a in b]]],
				['instanceof', ({ a, b }) => [[a instanceof b]]]
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
				['?', ':', ({ a, index, chunks, prepareChunk }) => {
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

					chunks[index - 1] = !!a ? b.join('') : c.join('');
					chunks.splice(index, b.length + c.length + 2);
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

		let operatorsKeys = Object.values(precedenceOperatorKeysMap).flat();
		const allPrecedences = Object.keys(precedenceOperatorsMap).sort((a, b) => b - a);

		$.evaluate = (str, context = {}) => {
			const parse = (str) => {
				const operatorsRe = new RegExp(`^(${operatorsKeys
					.map((item) => item.replace(/[|+\\/?*^.,()]/g, '\\$&'))
					.sort((a, b) => b.length - a.length)
					.join('|')})`
				);

				const chunks = [];
				let inWord = false;
				let inString = false;
				let inArgument = false;
				let tokensQueue = '';

				while (true) {
					const token = str[0];

					if (token === undefined) {
						break;
					}

					if (!inWord) {
						inWord = tokensQueue.length === 0 && /\w/.test(token);
					} else if (/\W/.test(token) && token !== '_') {
						inWord = false;
					}

					inWord = false;
					let operatorsDetected = !inWord && operatorsRe.test(str)
					str = str.slice(1);

					let operatorMatch = str.match(operatorsRe);
					operatorsDetected = !inWord && (operatorsDetected || operatorMatch !== null);
					tokensQueue += token;

					if (operatorsDetected && /^\w/.test(operatorMatch) && /\w$/.test(tokensQueue)) {
						operatorsDetected = false;
					}

					if (quotes.includes(token)) {
						inString = !inString;
					}

					if (str.length === 0 || (!inString && !inArgument && operatorsDetected)) {
						const tokenToAdd = tokensQueue.trim();
						if (tokenToAdd.length) {
							chunks.push(tokensQueue.trim());
						}

						if (operatorsDetected) {
							str = str.replace(operatorsRe, (match) => {
								chunks.push(match.trim())
								return '';
							});
						}

						tokensQueue = '';
					}
				}

				return chunks;
			}

			const compile = (precedences, chunks) => {
				const precedence = precedences.shift();
				const prepareChunk = (chunk) => {
					if (chunk in chunkKeywordMap) {
						return chunkKeywordMap[chunk];
					}

					if (quotes.includes(chunk[0])) {
						return chunk.substring(1).substring(0, chunk.length - 2);
					}

					if (!Array.isArray(chunk) && !Number.isNaN(parseFloat(chunk))) {
						return parseFloat(chunk);
					}

					if (chunk in context) {
						return context[chunk];
					}

					return chunk;
				}

				if (precedence === undefined || chunks.length === 1) {
					return prepareChunk(chunks);
				}

				const operators = precedenceOperatorKeysMap[precedence];

				if (!chunks.some((chunk) => operators.includes(chunk))) {
					return compile(precedences, chunks);
				}

				let startIndex = 0;
				const chunksLength = chunks.length;

				const getGroupChunks = (chunks, cursorIndex, openToken, closeToken) => {
					const groupChunks = []
					let closingBracesRequired = 1;

					while (closingBracesRequired > 0 || cursorIndex < chunks.length) {
						cursorIndex += 1;
						const token = chunks[cursorIndex];

						if (token === openToken) {
							closingBracesRequired ++;
						}

						if (token === closeToken) {
							closingBracesRequired --;
						}

						if (closingBracesRequired === 0) {
							break;
						}

						groupChunks.push(chunks[cursorIndex]);
					}

					return groupChunks;
				}

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
							chunks
						});
						if (typeof result === 'number') {
							startIndex += result;
						} else {
							let resultPosition = result[2] ?? undefined;
							const spliceLength = result[1] ?? 2;
							if (resultPosition === undefined) {
								resultPosition = typeof chunks[startIndex - 1] === undefined ? startIndex : startIndex - 1;
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
			}

			return compile([...allPrecedences], parse(str));
		}
	}
}
