import type { Signalize } from "..";

export default () => {
	return ($: Signalize) => {
		const chunkKeywordMap = {
			'undefined': undefined,
			'true': true,
			'false': false,
		}
		const quotes = ['"', "'", '`'];
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
		var precedenceOperatorsMap =  {
			// Todo left side like typeof a
			/* 14: {
				'++': (a) => ++a,
				'--': (a) => --a,
				'!': (a) => !!a,
				'!!;': (a) => !!a,
				'typeof': (a) => typeof a,
			}, */
			17: {
				'?.': (a, b) => a[b] ?? undefined,
				'.': (a, b) => a[b],
				'(': () => {},
				')': () => {}
			},
			13: {
				'**': (a, b) => a ** b,
			},
			12: {
				'*': (a, b) => a * b,
				'/': (a, b) => a / b,
				'%': (a, b) => a % b,
			},
			11: {
				'+': (a, b) => a + b,
				'-': (a, b) => a - b,
			},
			9: {
				'<': (a, b) => a < b,
				'<=': (a, b) => a <= b,
				'>': (a, b) => a > b,
				'>=': (a, b) => a >= b,
				in: (a, b) => a in b,
				instanceof: (a, b) => a instanceof b,
			},
			8: {
				'==': (a, b) => a === b ,
				'!=':  (a, b) => a !== b,
				'===': (a, b) => a === b,
				'!==': (a, b) => a !== b,
			},
			7: {
				'&':  (a, b) => a & b,
			},
			6: {
				'^': (a, b) => a ^ b,
			},
			5: {
				'|':  (a, b) => a | b,
			},
			4: {
				'&&': (a, b) => a && b,
			},
			3: {
				'||': (a, b) => a || b,
				'??': (a, b) => a ?? b,
			},
			1: {
				',': (a, b) => {}
			}
		};

		let operatorsKeys = [];

		for (const precedence in precedenceOperatorsMap) {
			operatorsKeys = [
				...operatorsKeys,
				...Object.keys(precedenceOperatorsMap[precedence])
			]
		}

		const allPrecedences = Object.keys(precedenceOperatorsMap).sort((a, b) => b - a);

		$.evaluate = (str, context = {}) => {
			const parse = (str) => {
				const operatorsRe = new RegExp(`^(${operatorsKeys
					.map((item) => item.replace(/[|+\\/?*^.,()]/g, '\\$&'))
					.sort((a, b) => b.length - a.length)
					.join('|')})`);

				const chunks = [];
				let inString = false;
				let inArgument = false;
				let tokensQueue = '';

				while (true) {
					const token = str[0];
					if (token === undefined) {
						break;
					}

					let operatorsDetected = operatorsRe.test(str)
					str = str.slice(1);
					operatorsDetected = operatorsDetected || operatorsRe.test(str);
					tokensQueue += token;

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

			const prepareChunk = (chunk) => {
				if (chunk in chunkKeywordMap) {
					return chunkKeywordMap[chunk];
				}

				if (quotes.includes(chunk[0])) {
					return chunk.substring(1).substring(0, chunk.length - 2);
				}

				if (!Number.isNaN(parseFloat(chunk))) {
					return parseFloat(chunk);
				}

				if (chunk in context) {
					return context[chunk];
				}

				return chunk;
			}

			const compile = (precedences, chunks) => {
				const precedence = precedences.shift();

				if (precedence === undefined || chunks.length === 1) {
					return prepareChunk(chunks[0]);
				}

				const operators = precedenceOperatorsMap[precedence];
				let a;
				let b;
				let operator;
				let startIndex = 0;
				const chunksLength = chunks.length;

				const loadGroupedChunks = (chunks, cursorIndex) => {
					const groupChunks = []
					let closingBracesRequired = 1;
					while (closingBracesRequired > 0 || cursorIndex > chunks.length) {
						cursorIndex += 1;
						const token = chunks[cursorIndex];

						if (token === '(') {
							closingBracesRequired ++;
						}

						if (token === ')') {
							closingBracesRequired --;
						}

						if (closingBracesRequired === 0) {
							break;
						}

						groupChunks.push(chunks[cursorIndex]);
					}

					return groupChunks;
				}

				const processGroup = (chunks, operatorIndex = 0) => {
					const args = loadGroupedChunks(chunks, operatorIndex);
					const argsLength = args.length + 2;
					chunks[operatorIndex] = compile([...allPrecedences], args)
					chunks.splice(operatorIndex + 1, argsLength);
				}

				while (startIndex <= chunksLength) {
					if (chunks[startIndex] in operators) {
						operator = chunks[startIndex];

						if (operator === '(') {
							processGroup(chunks);
						} else {
							chunks[startIndex] = operators[operator](prepareChunk(chunks[startIndex + 1]));
							chunks.splice(startIndex + 1, 1);
						}
					} else if (chunks[startIndex + 1] in operators) {
						const operatorIndex = startIndex + 1;
						operator = chunks[operatorIndex];
						a = prepareChunk(chunks[startIndex]);

						if (operator === '(') {
							if (typeof a === 'function') {
								const args = loadGroupedChunks(chunks, operatorIndex);
								const argsLength = args.length;
								chunks[startIndex] = a.apply(
									context,
									argsLength > 0 ? [compile([...allPrecedences], args)] : []
								);
								chunks.splice(startIndex + 1, argsLength + 2);
							} else {
								processGroup(chunks, operatorIndex);
							}
						} else {
							b = prepareChunk(chunks[startIndex + 2]);
							chunks[startIndex] = operators[operator](a, b);
							chunks.splice(startIndex + 1, 2);
						}
					} else {
						startIndex++;
					}
				}

				return compile(precedences, chunks);
			}

			const res = compile([...allPrecedences], parse(str));

			return res;
		}
	}
}
