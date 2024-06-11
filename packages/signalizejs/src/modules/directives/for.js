/** @type {import('../../Signalize').SignalizeModule} */
export default async ({ resolve, params }) => {
	const { attributePrefix } = params;
	const resolved = await resolve('directives', 'evaluate', 'scope', 'signal');
	const { getPrerenderedNodes, evaluate, processDirectives, signal, Signal } = resolved;
	const _scope = resolved.scope;

	const forDirective = async ({ scope, attribute }) => {
		const { $el, $parentScope } = scope;

		if ($el.tagName.toLowerCase() !== 'template') {
			return;
		}

		const forLoopRe = /([\s\S]+)\s+(in|of)\s+([\s\S]+)/;
		const argumentsMatch = attribute.value.match(forLoopRe);

		if (argumentsMatch.length < 4) {
			throw new Error(`Invalid for loop syntax "${attribute.value}".`);
		}

		/** @type {string[]} */
		const newContextVariables = argumentsMatch[1].replace(/[[({})\]\s]/g, '').split(',').map((key) => key.trim());
		let currentState = getPrerenderedNodes($el);
		/** @type {Record<string, Element>} */
		let currentStateKeys = {};
		/** @type {Element[]} */
		let newState = [];
		const prerendered = currentState.length > 0;

		const reduceState = () => {
			let i = currentState.length;

			while (i--) {
				let item = currentState[i];

				if (newState.includes(item)) {
					continue;
				}

				item.remove();
			}
		};

		const evaluateKey = (node) => {
			let generated = node.getAttribute(`${attributePrefix}key`);

			if (generated) {
				return generated;
			}

			let key = null;
			const keyFnString = node.getAttribute(`:${attributePrefix}key`);

			if (keyFnString) {
				const { result } = evaluate(keyFnString, _scope(node));
				key = result;
			}

			return key;
		};

		let inited = false;
		/** @type {import('../signal.js').Signal} */
		let loopSignalsToWatch = [];

		/**
		 * @returns {void}
		 */
		const process = () => {
			let { result, detectedSignals } = evaluate(argumentsMatch[3], scope, !inited);

			result = result instanceof Signal ? result() : result;

			if (!inited) {
				loopSignalsToWatch = detectedSignals;
				inited = true;

				if (prerendered) {
					return;
				}
			}

			if (typeof result === 'number') {
				result = [...Array(result).keys()];
			}

			const totalCount = result.length ?? result.size;
			let counter = 0;

			const isArrayDestruct = argumentsMatch[0].trim().startsWith('[');

			for (const index in currentState) {
				const node = currentState[index];

				if (!(node instanceof Element)) {
					continue;
				}

				const key = node.getAttribute('key');

				if (key) {
					currentStateKeys[key] = currentState[index];
				}
			}

			/**
			 *
			 * @param {any} context
			 * @param {number} counter
			 * @returns {void}
			 */
			const iterate = (context, counter) => {
				const iterator = signal({
					counter,
					first: counter === 0,
					last: counter === totalCount - 1,
					odd: counter % 2 !== 0,
					even: counter % 2 === 0
				});
				let destruct = {};

				if (newContextVariables.length > 1) {
					if (isArrayDestruct) {
						for (const key of Object.keys(context)) {
							destruct[newContextVariables[key]] = context[key];
						}
					} else {
						for (const key of newContextVariables) {
							destruct[key] = context[key];
						}
					}
				} else {
					destruct[newContextVariables] = context;
				}


				const templateFragment = [...$el.cloneNode(true).content.children];

				while (templateFragment.length > 0) {
					const fragment = templateFragment.shift();

					const fragmentScope = _scope(fragment, (elScope) => {
						elScope.$parentScope = $parentScope;
						elScope.$data = {
							...scope.$data,
							...destruct,
							iterator
						};
						elScope.$template = $el;
					});

					const fragmentKey = evaluateKey(fragment);
					fragment.removeAttribute('key');

					if (fragmentKey && fragmentKey in currentStateKeys) {
						newState.push(currentStateKeys[fragmentKey]);
						return;
					}

					for (const child of fragment.children) {
						_scope(child, (childScope) => {
							childScope.$data = fragmentScope.$data;
							childScope.$parentScope = $parentScope;
						});
					}

					void processDirectives({ root: fragment });
					newState.push(fragment);
				}
			};

			if (argumentsMatch[2] === 'in') {
				for (const stackItem in result) {
					iterate(stackItem, counter++);
				}
			} else {
				for (let stackItem of result) {
					iterate(stackItem, counter++);
				}
			}

			let insertPoint = $el;

			reduceState();

			for (const index in newState) {
				const fragment = newState[index];
				const currentInsertPoint = insertPoint;
				insertPoint = fragment;

				if (currentState[index] === fragment) {
					continue;
				}

				currentInsertPoint.after(fragment);
			}

			currentStateKeys = {};
			currentState = newState;
			newState = [];
		};

		process();

		/** @type {CallableFunction[]} */
		const unwatchSignalCallbacks = [];
		for (const signalToWatch of loopSignalsToWatch) {
			unwatchSignalCallbacks.push(signalToWatch.watch(process));
		}

		_scope($el, (elScope) => {
			elScope.$cleanup(() => {
				reduceState();
				while (unwatchSignalCallbacks.length > 0) {
					unwatchSignalCallbacks.shift()();
				}
			});
		});
	};

	return { forDirective };
};
