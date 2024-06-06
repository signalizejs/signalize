/** @type {import('../../Signalize').SignalizeModule} */
export default async ({ resolve, params }) => {
	const { attributePrefix } = params;
	const resolved = await resolve('directives', 'evaluate', 'scope', 'signal');
	const { getPrerenderedNodes, evaluate, directive, processDirectives, signal } = resolved;
	const _scope = resolved.scope;

	directive('for', {
		matcher: ({ element }) => {
			if (element.tagName.toLocaleLowerCase() !== 'template') {
				return;
			}

			return new RegExp(`(?::|${attributePrefix})for`);
		},
		callback: async ({ scope, attribute }) => {
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
			let prerendered = currentState.length > 0;

			const reduceState = (limit) => {
				while (currentState.length > limit) {
					currentState.pop().remove();
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
			let loopSignalsToWatch = [];

			/**
			 * @returns {Promise<void>}
			 */
			const process = async () => {
				let { result, detectedSignals } = evaluate(argumentsMatch[3], scope.$data, !inited);
				result = typeof result === 'function' ? result() : result;

				if (!inited) {
					loopSignalsToWatch = detectedSignals;
					inited = true;

					if (prerendered) {
						return;
					}
				}

				if (prerendered) {
					reduceState(0);
					prerendered = false;
				}

				if (typeof result === 'number') {
					result = [...Array(result).keys()];
				}

				const totalCount = result.length ?? result.size;
				let counter = 0;
				let lastInsertPoint = currentState[currentState.length - 1] ?? $el;

				const isArrayDestruct = argumentsMatch[0].trim().startsWith('[');
				const parentContext = scope.$data;
				/**
				 *
				 * @param {any} context
				 * @param {number} counter
				 * @returns {Promise<void>}
				 */
				const iterate = async (context, counter) => {
					const iterator = signal({
						count: counter,
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

					/**
					 *
					 * @param {Node} fragment
					 * @returns {Promise<void>}
					 */
					const processChild = async (fragment) => {
						_scope(fragment, (elScope) => {
							elScope.$data = {
								...elScope.$data,
								...destruct,
								...parentContext,
								iterator
							};
							elScope.$template = $el;
							elScope.$parentScope = $parentScope;
						});

						const fragmentKey = evaluateKey(fragment);
						fragment.removeAttribute('key');

						if (fragmentKey) {
							let existingItemIndex = null;
							let existingItem = currentState.find((currentStateItem, index) => {
								const keyMatches = currentStateItem.getAttribute('key') === fragmentKey;
								if (keyMatches) {
									existingItemIndex = index;
								}
								return keyMatches;
							});

							if (existingItem) {
								if (existingItemIndex > counter && currentState[counter] !== undefined) {
									const tmp = currentState[counter];
									if (counter === 0) {
										currentState[counter].before(existingItem);
									} else {
										currentState[counter - 1].after(existingItem);
									}
									currentState[counter] = existingItem;
									currentState[existingItemIndex] = tmp;
									lastInsertPoint = currentState[currentState.length - 1];
								}
							} else if (counter >= currentState.length) {
								lastInsertPoint.after(fragment);
								lastInsertPoint = fragment;
								for (const child of fragment.children) {
									_scope(child, (elScope) => {
										elScope.$data = {...elScope.$data, ..._scope(fragment).$data};
										elScope.$parentScope = _scope(fragment);
									});
									void processDirectives({ root: child });
								}
							} else {
								currentState[counter].before(fragment);
								void processDirectives({ root: fragment });
							}
						} else if (currentState.length > 0 && counter < currentState.length) {
							_scope(currentState[counter], (elScope) => {
								elScope.$data = {...elScope.$data, ...destruct, iterator };
								processDirectives({ root: currentState[counter], mode: 'reinit' });
							});
						} else if (currentState.length === 0 || counter >= currentState.length) {
							lastInsertPoint.after(fragment);
							currentState.push(fragment);
							lastInsertPoint = fragment;

							for (const child of fragment.children) {
								_scope(child, (elScope) => {
									elScope.$data = {...elScope.$data, ..._scope(fragment).$data};
									elScope.$parentScope = _scope(fragment);
								});
							}

							void processDirectives({ root: fragment });
						}
					};

					const templateFragment = [...$el.cloneNode(true).content.children];
					const childPromises = [];
					while (templateFragment.length > 0) {
						childPromises.push(processChild(templateFragment.shift()));
					}

					await Promise.all(childPromises);
				};

				const iterationPromises = [];
				if (argumentsMatch[2] === 'in') {
					for (const stackItem in result) {
						iterationPromises.push(iterate(stackItem, counter++));
					}
				} else {
					for (let stackItem of result) {
						iterationPromises.push(iterate(stackItem, counter++));
					}
				}

				await Promise.all(iterationPromises);

				reduceState(counter);
			};

			await process();

			const unwatchSignalCallbacks = [];
			for (const signalToWatch of loopSignalsToWatch) {
				unwatchSignalCallbacks.push(signalToWatch.watch(process));
			}

			_scope($el, (elScope) => {
				elScope.$cleanup(() => {
					reduceState(0);
					while (unwatchSignalCallbacks.length > 0) {
						unwatchSignalCallbacks.shift()();
					}
				});
			});
		}
	});
};
