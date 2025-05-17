/** @type {import('../../../types/Signalize').Module} */
export default async ({ resolve }) => {
	const resolved = await resolve('directives', 'evaluator', 'scope', 'signal', 'strings/tokenizer');
	const { evaluate, Signal, createTokenizer } = resolved;

	const classDirective = async ({ matches, attribute, scope }) => {
		const { $el } = scope;
		const isShorthand = attribute.name.startsWith('{');
		const attributeValue = isShorthand ? matches[3] : attribute.value;
		let inString = false;
		let openingQuote = '';
		let requiredClosingBrackets = 0;
		let openingBracket = '';
		let chunkTokenQueue = ''
		const tokenizer = createTokenizer(attributeValue);
		const classRawParts = [];

		const openCloseBracketsPair = {
			'(': ')',
			'[': ']',
			'{': '}'
		};
		while (tokenizer.canConsumeTokens()) {
			const token = tokenizer.consumeTokens();

			if (tokenizer.isToken('quote', token)) {
				if (inString && openingQuote === token) {
					openingQuote = '';
					inString = false;
				} else {
					openingQuote = token;
					inString = true;
				}
			}

			if (!inString) {
				if (tokenizer.isToken('openingBracket', token)) {
					if (requiredClosingBrackets === 0) {
						openingBracket = token;
					}

					requiredClosingBrackets++;
				} else if (tokenizer.isToken('closingBracket', token) && token === openCloseBracketsPair[openingBracket]) {
					requiredClosingBrackets--;
					if (requiredClosingBrackets === 0) {
						openingBracket = '';
					}
				}
			}

			if (!inString && requiredClosingBrackets === 0) {
				if (token === ',') {
					classRawParts.push(chunkTokenQueue);
					chunkTokenQueue = '';
				} else {
					chunkTokenQueue += token;
				}
			} else {
				chunkTokenQueue += token;
			}
		}

		if (chunkTokenQueue.trim() !== '') {
			classRawParts.push(chunkTokenQueue);
		}

		/** @type {Record<string, string>} */
		const evaluatedClassCache = {};

		/** @type {string[]} */
		let settedClasses = [];

		const setClassAttribute = () => {
			const newClasses = [];

			for (const newClass of Object.values(evaluatedClassCache)) {
				if (newClass.trim() !== '') {
					newClasses.push(newClass);
					$el.classList.add(newClass);
				}
			}

			for (const className of settedClasses) {
				if (!newClasses.includes(className)) {
					$el.classList.remove(className);
				}
			}

			settedClasses = newClasses
		}

		/**
		 * @param {string} classPart
		 * @param {boolean} setAttribute
		 * @param {boolean} trackSignals
		 */
		const evaluateClassPart = (classPart, setAttribute, trackSignals = false) => {
			const { result, detectedSignals } = evaluate(
				classPart,
				{
					$el,
					...scope
				},
				trackSignals
			);

			evaluatedClassCache[classPart] = result instanceof Signal ? result() : result;

			if (setAttribute === true) {
				setClassAttribute();
			}

			return detectedSignals;
		};


		for (const classRawPart of classRawParts) {
			const detectedSignals = evaluateClassPart(classRawPart, false, true);

			for (const signal of detectedSignals) {
				signal.watch(() => evaluateClassPart(classRawPart, true));
			}
		}

		setClassAttribute();
	}



	return { classDirective }
};
