/**
 * @returns {import('../../Signalize').SignalizePlugin}
 */
export default () => {
	/**
	 * @param {import('../../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
		$.directive('for', {
			matcher: ({ element }) => {
				if (element.tagName.toLocaleLowerCase() !== 'template') {
					return;
				}

				return new RegExp(`(?::|${$.attributePrefix})for`);
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
				let currentState = $.getPrerenderedNodes($el);
				let prerendered = currentState.length > 0;
				let nextElementSibling = $el.nextElementSibling;

				while (nextElementSibling !== null) {
					if ($.scope(nextElementSibling)?.$template !== $el) {
						break;
					}

					currentState.push(nextElementSibling);
					nextElementSibling = nextElementSibling.nextElementSibling;
				}

				const reduceState = (limit) => {
					while (currentState.length > limit) {
						currentState.pop().remove();
					}
				};

				let inited = false;
				let loopSignalsToWatch = [];

				const processValue = async () => {
					const result = $.evaluate(argumentsMatch[3], scope.$data);
					return typeof result === 'function' ? result() : result;
				};

				/**
				 * @returns {Promise<void>}
				 */
				const process = async () => {
					let stack;

					if (!inited) {
						const getSignalsToWatch = $.observeSignals(scope.$data);
						stack = await processValue();
						loopSignalsToWatch = getSignalsToWatch();
						inited = true;

						if (prerendered) {
							return;
						}
					} else {
						stack = await processValue();
					}

					if (prerendered) {
						reduceState(0);
						prerendered = false;
					}

					inited = true;

					if (typeof stack === 'number') {
						stack = [...Array(stack).keys()];
					}

					const totalCount = stack.length ?? stack.size;
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
						const iterator = $.signal({
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
									destruct[newContextVariables[key]] = $.signal(context[key]);
								}
							} else {
								for (const key of newContextVariables) {
									destruct[key] = $.signal(context[key]);
								}
							}
						} else {
							destruct[newContextVariables] = $.signal(context);
						}

						/**
						 *
						 * @param {Node} fragment
						 * @returns {Promise<void>}
						 */
						const processChild = async (fragment) => {
							$.scope(fragment, (elScope) => {
								elScope.$data = {
									...destruct,
									...parentContext,
									iterator
								};
								elScope.$template = $el;
								elScope.$parentScope = $parentScope;
							});

							await $.processDirectives({ root: fragment, onlyRoot: true });

							const fragmentKey = fragment.getAttribute('key');

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
										$.scope(child, (elScope) => {
											elScope.$data = $.scope(fragment).$data;
											elScope.$parentScope = $.scope(fragment);
										});
										void $.processDirectives({ root: child });
									}
								} else {
									currentState[counter].before(fragment);
									void $.processDirectives({ root: fragment });
								}
							} else if (currentState.length > 0 && counter < currentState.length) {
								$.scope(currentState[counter], ({ $data }) => {
									for (const [key, value] of Object.entries({ ...destruct, iterator })) {
										const valueToSet = value instanceof $.Signal ? value() : value;
										if ($data[key] instanceof $.Signal) {
											$data[key](valueToSet);
										} else {
											$data[key] = valueToSet;
										}
									}
								});
							} else if (currentState.length === 0 || counter >= currentState.length) {
								lastInsertPoint.after(fragment);
								currentState.push(fragment);
								lastInsertPoint = fragment;
								for (const child of fragment.children) {
									$.scope(child, (elScope) => {
										elScope.$data = $.scope(fragment).$data;
										elScope.$parentScope = $.scope(fragment);
									});
									void $.processDirectives({ root: child });
								}
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
						for (let stackItem in stack) {
							iterationPromises.push(iterate(stackItem, counter++));
						}
					} else {
						for (let stackItem of stack) {
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

				$.scope($el, (elScope) => {
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
};
