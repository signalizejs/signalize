import type { Signalize, SignalizePlugin } from '../..';

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.directive('for', {
			matcher: ({ element }) => {
				if (element.tagName.toLocaleLowerCase() !== 'template') {
					return;
				}

				return new RegExp(`(?::|${$.attributePrefix})for`);
			},
			callback: async ({ element, data, attribute }) => {
				if (element.tagName.toLowerCase() !== 'template') {
					return;
				}

				const forLoopRe = /([\s\S]+)\s+(in|of)\s+([\s\S]+)/;
				const argumentsMatch = attribute.value.match(forLoopRe);
				const fnSharedPart = `const __result = typeof ${argumentsMatch[3]} === 'function' ? await ${argumentsMatch[3]}() : ${argumentsMatch[3]}`

				if (argumentsMatch.length < 4) {
					throw new Error(`Invalid for loop syntax "${attribute.value}".`);
				}

				const newContextVariables: string[] = argumentsMatch[1].replace(/[[({})\]\s]/g, '').split(',');

				let currentState = $.getPrerenderedNodes(element);
				let prerendered = currentState.length > 0;
				let nextElementSibling = element.nextElementSibling;

				while (nextElementSibling !== null) {
					if ($.scope(nextElementSibling)?.template !== element) {
						break;
					}

					currentState.push(nextElementSibling);
					nextElementSibling = nextElementSibling.nextElementSibling;
				}

				const reduceState = (limit) => {
					while (currentState.length > limit) {
						currentState.pop().remove();
					}
				}

				let inited = false;
				let loopSignalsToWatch = [];

				const process = async (): Promise<void> => {
					let stack;

					if (!inited) {
						const { result, signalsToWatch } = await $.directiveFunction({
							functionString: `
								const __getSignalsToWatch = $.observeSignals($context);
								${fnSharedPart}
								return { result: __result, signalsToWatch: __getSignalsToWatch() }
							`,
							context: data,
							element
						})(data);

						stack = result;
						loopSignalsToWatch = signalsToWatch;
						inited = true;

						if (prerendered) {
							return;
						}
					} else {
						stack = await $.directiveFunction({
							functionString: `
								${fnSharedPart}
								return __result;
							`,
							context: data,
							element
						})(data);
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
					let lastInsertPoint = currentState[currentState.length - 1] ?? element;

					const isArrayDestruct = argumentsMatch[0].trim().startsWith('[');
					const parentScopeData = data;
					const iterate = async (data: any, counter: number): Promise<void> => {
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
								for (const key of Object.keys(data)) {
									destruct[newContextVariables[key]] = $.signal(data[key]);
								}
							} else {
								for (const key of newContextVariables) {
									destruct[key] = $.signal(data[key]);
								}
							}
						} else {
							destruct[newContextVariables] = $.signal(data);
						}

						const templateFragment = [...element.cloneNode(true).content.children];
						const processChild = async (fragment: Node): Promise<void> => {
							$.scope(fragment, (fragmentScope) => {
								for (const [key, value] of Object.entries({
									...destruct,
									...parentScopeData,
									iterator
								})) {
									fragmentScope.data[key] = value;
								}
								fragmentScope.template = element;
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
										lastInsertPoint = currentState[currentState.length - 1]
									}
								} else if (counter >= currentState.length) {
									lastInsertPoint.after(fragment);
									lastInsertPoint = fragment;
									for (const child of fragment.children) {
										void $.processDirectives({ root: child });
									}
								} else {
									currentState[counter].before(fragment);
									void $.processDirectives({ root: fragment });
								}
							} else if (currentState.length > 0 && counter < currentState.length) {
								$.scope(currentState[counter], ({ data }) => {
									for (const [key, value] of Object.entries({ ...destruct, iterator })) {
										const valueToSet = value instanceof $.Signal ? value() : value;
										if (data[key] instanceof $.Signal) {
											data[key](valueToSet);
										} else {
											data[key] = valueToSet;
										}
									}
								});
							} else if (currentState.length === 0 || counter >= currentState.length) {
								lastInsertPoint.after(fragment);
								currentState.push(fragment);
								lastInsertPoint = fragment;
								for (const child of fragment.children) {
									void $.processDirectives({ root: child });
								}
							}
						}

						const childPromises = [];
						while (templateFragment.length > 0) {
							childPromises.push(processChild(templateFragment.shift()));
						}

						await Promise.all(childPromises);
					}

					const iterationPromises = [];
					if (argumentsMatch[2] === 'in') {
						for (let data in stack) {
							iterationPromises.push(iterate(data, counter++))
						}
					} else {
						for (let data of stack) {
							iterationPromises.push(iterate(data, counter++))
						}
					}

					await Promise.all(iterationPromises);

					reduceState(counter);
				}

				await process();

				const unwatchSignalCallbacks = [];

				for (const signalToWatch of loopSignalsToWatch) {
					unwatchSignalCallbacks.push(signalToWatch.watch(process))
				}

				$.scope(element).cleanup(() => {
					reduceState(0);

					while (unwatchSignalCallbacks.length > 0) {
						unwatchSignalCallbacks.shift()()
					}
				})
			}
		});
	}
}
