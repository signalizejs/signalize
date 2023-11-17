import type { Signalize, SignalizePlugin, Scope } from '..'

declare module '..' {
	interface Signalize {
		directive: (name: string, data: Directive) => void
		createDirectiveFunction: (options: CreateFunctionOptions) => () => Promise<any>
		AsyncFunction: () => Promise<any>
	}
}

type DirectiveCallback = (data: DirectiveCallbackData) => Promise<void> | void;

interface DirectiveCallbackData extends Scope {
	matches: RegExpMatchArray
	attribute: Attr
}

interface DirectiveMatcherParameters {
	element: Element
	attribute: Attr
}

type DirectiveMatcherReturn = RegExp | undefined

type DirectiveMatcher = (params: DirectiveMatcherParameters) => DirectiveMatcherReturn

interface ProcessElementOptions {
	element: Element
	mode: 'init' | 'reinit'
}

interface Directive {
	matcher?: RegExp | DirectiveMatcher
	callback: DirectiveCallback
}

interface RegisteredDirective extends Directive {
	matcher?: DirectiveMatcher
}

interface ProcessDirectiveOptions {
	root?: Element
	directiveName?: string
	mode?: 'init' | 'reinit'
}

interface CreateFunctionOptions {
	functionString: string
	context: Record<string, any>
	element?: Element | Document | DocumentFragment
}

interface PluginOptions {
	renderedBlockStart?: string
	renderedBlockEnd?: string
}

export default (pluginOptions?: PluginOptions): SignalizePlugin => {
	return ($: Signalize) => {
		const { bind, on, scope, signal, globals, attributePrefix, observeSignals, attributeSeparator } = $;
		const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
		const directives: Record<string, RegisteredDirective> = {};
		const directivesAttribute = `${attributePrefix}directives`;
		const ignoreAttribute = `${directivesAttribute}${attributeSeparator}ignore`;
		const orderAttribute = `${directivesAttribute}${attributeSeparator}order`
		const renderedTemplateStartComment = pluginOptions?.renderedBlockStart ?? 'prerendered';
		const renderedTemplateEndComment = pluginOptions?.renderedBlockEnd ?? '/prerendered';
		let inited = false;

		const processElement = async (options?: ProcessElementOptions): Promise<Element> => {
			const element: Element = options.element;
			const mode = options.mode ?? 'init';
			const canExecute = ['reinit', 'init'].includes(mode);
			const canCompile = mode === 'init';

			const elementClosestScope = element.closest(`[${$.scopeAttribute}]`);

			if (elementClosestScope && typeof elementClosestScope[$.scopeKey] === 'undefined') {
				return element;
			}

			let elementScope = scope(element);

			if (mode === 'reinit') {
				elementScope.cleanup();
			}

			const compiledDirectives = elementScope?.directives ?? new Map();

			let directivesQueue = [...options.directives ?? Object.keys(directives)];
			const customDirectivesOrder = element.getAttribute(orderAttribute) ?? '';

			if (customDirectivesOrder.length > 0) {
				directivesQueue = [...new Set([
					...customDirectivesOrder.split(',').map((item) => item.trim()).filter((item) => item.length > 0),
					...directivesQueue
				])]
			}

			directivesQueue = directivesQueue.filter((item) => !compiledDirectives.has(item) );
			let countdown = element.attributes.length;
			const processedAttributes = [];

			if (canCompile) {
				while (directivesQueue.length && countdown) {
					const directiveName = directivesQueue.shift();
					const matcher = directives[directiveName]?.matcher

					for (const attribute of element.attributes) {
						if (attribute.name in processedAttributes) {
							continue;
						}

						const matcherReturn = matcher({ element, attribute });

						if (matcherReturn === undefined) {
							continue;
						}

						const matches = new RegExp(`^${matcherReturn.source}$`).exec(attribute.name);
						if (matches === null) {
							continue;
						}

						scope(element, (newScope) => {
							if (newScope.directives === undefined) {
								newScope.directives = new Map();
							}

							if (elementScope === undefined) {
								elementScope = newScope;
							}
						});
						countdown--;

						processedAttributes.push(attribute.name);
						const directive = directives[directiveName];
						elementScope.directives.set(
							directiveName,
							[
								...elementScope.directives.get(directiveName) ?? [],
								(elementScope) => {
									return directive.callback({
										...elementScope,
										data: elementScope.data,
										matches,
										attribute
									})
								}
							]
						);
					}
				}
			}

			const directivesToRun = [...elementScope?.directives?.keys() ?? []]

			const runDirective = async (name: string): Promise<void> => {
				const promises = [];

				for (const directiveFunction of elementScope.directives.get(name)) {
					promises.push(directiveFunction(elementScope));
				}

				await Promise.all(promises);
			}

			while (canExecute && directivesToRun.length > 0) {
				await runDirective(directivesToRun.shift())
			}

			element.removeAttribute($.cloakAttribute);

			return element;
		};

		const processDirectives = async (options?: ProcessDirectiveOptions = {}): Promise<Element | Document | DocumentFragment> => {
			let { root = $.root, directiveName, mode = 'init' } = options;
			const directivesToProcess = directiveName === undefined ? Object.keys(directives) : [directiveName];
			await $.traverseDom({
				root,
				nodeTypes: [1],
				callback: async (node) => {
					if (node?.closest(`[${ignoreAttribute}]`)) {
						return;
					}

					await processElement({
						element: node,
						mode,
						directives: directivesToProcess
					});
				}
			})

			return root;
		}

		const directive = (name: string, { matcher, callback }: Directive): void => {
			if (name in directives) {
				throw new Error(`Directive "${name}" already defined.`);
			}

			directives[name] = {
				callback,
				matcher: typeof matcher === 'function' ? matcher : () => matcher
			}

			if (inited) {
				void processDirectives({ directiveName: name })
			}
		}

		const createFunctionCache = {};

		const createFunction = (options: CreateFunctionOptions): typeof AsyncFunction => {
			const { functionString, context = {} } = options;
			const cacheKey = `${options.functionString.replace(/\s*/g, '_')}-${Object.keys(options.context).join('-')}`;
			if (!(cacheKey in createFunctionCache)) {
				const functionDataKeys = Object.keys({ $signalize: $, ...globals, ...context });
				createFunctionCache[cacheKey] = async (data: Record<string, any>) => {
					let functionData = { $signalize: $, ...globals, ...data }
					try {
						return new AsyncFunction('_context', '$element', `
							'use strict';
							try {
								let { ${functionDataKeys.join(',')} } = _context;

								${functionString}
							} catch(e) {
								console.error($element ?? '', e);
							}
						`)(functionData, options.element);
					} catch (e) {
						console.error(options.element ?? '', e);
					}
					return null
				}
			}
			return createFunctionCache[cacheKey];
		}

		const getPrerenderedNodes = (template: HTMLTemplateElement) => {
			const renderedNodes = [];
			let renderedTemplateSibling = template.nextSibling;
			let renderedTemplateOpenned = false;

			while (renderedTemplateSibling) {
				if (!renderedTemplateOpenned && renderedTemplateSibling.nodeType === Node.TEXT_NODE && renderedTemplateSibling.textContent.trim().length > 0) {
					break;
				}

				if (renderedTemplateSibling.nodeType === Node.COMMENT_NODE) {
					const content = renderedTemplateSibling.textContent?.trim();
					if (content === renderedTemplateStartComment) {
						renderedNodes.push(renderedTemplateSibling);
						renderedTemplateOpenned = true;
						renderedTemplateSibling = renderedTemplateSibling.nextSibling;
						continue;
					} else if (content === renderedTemplateEndComment) {
						renderedNodes.push(renderedTemplateSibling);
						renderedTemplateOpenned = false;
						break;
					}
				}

				if (renderedTemplateOpenned) {
					renderedNodes.push(renderedTemplateSibling);
				}

				renderedTemplateSibling = renderedTemplateSibling.nextSibling;
			}

			return renderedNodes;
		}

		directive('signal', {
			matcher: new RegExp(`(?:\\$|${attributePrefix}signal${attributeSeparator})(\\S+)`),
			callback: async ({ matches, element, data, attribute }): Promise<void> => {
				const fn = createFunction({
					functionString: `
						const result = ${attribute.value.length ? attribute.value : "''"};
						return result instanceof $signalize.Signal ? result() : result;
					`,
					context: data,
					element
				});

				const newSignal = signal();

				const setSignal = async () => {
					let result = await fn(data);

					if (typeof result === 'string' && result.length > 0 && !isNaN(result)) {
						result = parseFloat(result);
					}

					newSignal.value = result;
				}

				let unwatchSignalCallbacks = [];
				const getSignalsToWatch = observeSignals(data);

				await setSignal();

				unwatchSignalCallbacks = [];

				for (const signalToWatch of getSignalsToWatch()) {
					unwatchSignalCallbacks.push(signalToWatch.watch(setSignal))
				}

				scope(element, ({ data, cleanup }) => {
					data[matches[1]] = newSignal;
					cleanup(() => {
						while (unwatchSignalCallbacks.length > 0) {
							unwatchSignalCallbacks.shift()()
						}
					})
				})
			}
		});

		directive('for', {
			matcher: ({ element }) => {
				if (element.tagName.toLocaleLowerCase() !== 'template') {
					return;
				}

				return new RegExp(`(?::|${attributePrefix})for`);
			},
			callback: async ({ element, data, attribute }) => {
				if (element.tagName.toLowerCase() !== 'template') {
					return;
				}

				const forLoopRe = /([\s\S]+)\s+(in|of)\s+([\s\S]+)/;
				const argumentsMatch = attribute.value.match(forLoopRe);

				if (argumentsMatch.length < 4) {
					throw new Error(`Invalid for loop syntax "${attribute.value}".`);
				}

				const newContextVariables: string[] = argumentsMatch[1].replace(/[[({})\]\s]/g, '').split(',');

				const stackFn = createFunction({
					functionString: `return typeof ${argumentsMatch[3]} === 'function' ? ${argumentsMatch[3]}() : ${argumentsMatch[3]};`,
					context: data,
					element
				});

				let signalsToWatch = [];
				let inited = false;
				let getUsedSignals;
				let prerenderedNodes = getPrerenderedNodes(element);

				const process = async (): Promise<void> => {
					if (!inited) {
						getUsedSignals = observeSignals(data);
					}

					let stack = await stackFn(data);

					if (!inited) {
						signalsToWatch = getUsedSignals();
						inited = true;
						if (prerenderedNodes.length) {
							return;
						}
					}

					const currentState = [];

					while(prerenderedNodes.length > 0) {
						prerenderedNodes.pop()?.remove();
					}

					let nextElementSibling = element.nextElementSibling;

					while (nextElementSibling !== null) {
						if (scope(nextElementSibling)?.template !== element) {
							break;
						}

						currentState.push(nextElementSibling);
						nextElementSibling = nextElementSibling.nextElementSibling;
					}
					const currentStateLength = currentState.length;

					inited = true;

					if (typeof stack === 'number') {
						stack = [...Array(stack).keys()];
					}

					const totalCount = stack.length ?? stack.size;
					let counter = 0;
					let lastInsertPoint = currentState[currentStateLength - 1] ?? element;

					const isArrayDestruct = argumentsMatch[0].trim().startsWith('[');
					const parentScopeData = data;
					const iterate = async (data: any, counter: number): Promise<void> => {
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
								for (const key of Object.keys(data)) {
									destruct[newContextVariables[key]] = signal(data[key]);
								}
							} else {
								for (const key of newContextVariables) {
									destruct[key] = signal(data[key]);
								}
							}
						} else {
							destruct[newContextVariables] = signal(data);
						}

						const templateFragment = [...element.cloneNode(true).content.children];

						const processChild = async (fragment: Node): Promise<void> => {
							scope(fragment, (fragmentScope) => {
								for (const [key, value] of Object.entries({
									...destruct,
									...parentScopeData,
									iterator
								})) {
									fragmentScope.data[key] = value;
								}
								fragmentScope.template = element;
							});

							await processElement({ element: fragment, mode: 'init' });

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
										processDirectives({ root: child });
									}
								} else {
									currentState[counter].before(fragment);
									void processDirectives({ root: fragment });
								}
							} else if (currentState.length > 0 && counter < currentState.length) {
								scope(currentState[counter], ({ data }) => {
									for (const [key, value] of Object.entries({ ...destruct, iterator })) {
										data[key].set(value());
									}
								})
							} else if (currentState.length === 0 || counter >= currentState.length) {
								lastInsertPoint.after(fragment);
								lastInsertPoint = fragment;

								for (const child of fragment.children) {
									await processDirectives({ root: child });
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

					nextElementSibling = element.nextElementSibling;
					let removeId = 0;

					while (nextElementSibling !== null) {
						if (scope(nextElementSibling)?.template !== element) {
							break;
						}
						const nextElementToRemove = nextElementSibling.nextElementSibling;

						if (removeId >= counter) {
							nextElementSibling.remove();
						}

						nextElementSibling = nextElementToRemove;
						removeId++;
					}
				}

				await process();

				const unwatchSignalCallbacks = [];
				for (const signalToWatch of signalsToWatch) {
					unwatchSignalCallbacks.push(signalToWatch.watch(process))
				}

				scope(element).cleanup(() => {
					while (unwatchSignalCallbacks.length > 0) {
						unwatchSignalCallbacks.shift()()
					}
				})
			}
		});

		directive('if', {
			matcher: ({ element }) => {
				if (element.tagName.toLowerCase() !== 'template') {
					return;
				}

				return new RegExp(`(?::|${attributePrefix})if`);
			},
			callback: async ({ element, data, attribute }) => {
				const fn = createFunction({
					functionString: `
						const result = ${attribute.value};
						return typeof result === 'function' ? result() : result;
					`,
					context: data,
					element
				});

				let nextSibling = element.nextSibling;
				const nextSiblingScope = scope(nextSibling);
				let rendered = nextSiblingScope?.template === element;
				let prerendered = true;
				let renderedNodes = [];

				if (rendered === false) {
					renderedNodes = getPrerenderedNodes(element);
					if (renderedNodes.length) {
						rendered = true;
						prerendered = true;
					}
				}
				let inited = false;
				let signalsToWatch;
				let getSignalsToWatch = null;

				const render = async (): Promise<void> => {
					if (!inited) {
						getSignalsToWatch = observeSignals(data);
					}
					const conditionResult = await fn(data);

					if (!inited) {
						signalsToWatch = getSignalsToWatch();
						inited = true;

						if (rendered) {
							return;
						}
					}

					if (conditionResult !== true || prerendered) {
						while (renderedNodes.length > 0) {
							renderedNodes.pop().remove()
						}
					}

					if (conditionResult !== true) {
						rendered = false;
						return;
					}

					let fragment = element.cloneNode(true).content;
					const dataForFragment = data;
					scope(fragment, ({ data }) => {
						for (const [key, value] of Object.entries(dataForFragment)) {
							data[key] = value;
						}
					});

					fragment = await processDirectives({ root: fragment });
					renderedNodes = [...fragment.childNodes];
					element.after(fragment);
					rendered = true;
				}

				await render();

				const unwatchSignalCallbacks = [];

				while (signalsToWatch.length) {
					unwatchSignalCallbacks.push(signalsToWatch.shift().watch(render));
				}

				scope(element).cleanup(() => {
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				})
			}
		})

		directive('bind', {
			matcher: ({ element, attribute }) => {
				if ([':for', ':if'].includes(attribute.name) && element.tagName.toLowerCase() === 'template') {
					return;
				}

				return new RegExp(`(?::|${attributePrefix}bind${attributeSeparator})(\\S+)|(\\{([^{}]+)\\})`)
			},
			callback: async ({ matches, element, data, attribute }) => {
				const isShorthand = attribute.name.startsWith('{');
				const attributeValue = isShorthand ? matches[3] : attribute.value;
				const attributeName = isShorthand ? matches[3] : matches[1];

				const fn = createFunction({
					functionString: `
						const result = ${attributeValue};
						return typeof result === 'function' ? result() : result;
					`,
					context: data,
					element
				});

				const getSignalsToWatch = observeSignals(data);

				await fn(data);

				bind(element, {
					[attributeName]: [...getSignalsToWatch(), () => fn(data)]
				});
			}
		});

		directive('on', {
			matcher: new RegExp(`(?:\\@|${attributePrefix}on${attributeSeparator})(\\S+)`),
			callback: async (scope) => {
				const { matches, element, data, attribute } = scope;

				on(matches[1], element, async (event) => {
					const context = {
						$event: event,
						$element: element,
						...data
					}
					const fn = createFunction({
						functionString: `
							const result = ${attribute.value};
							typeof result === 'function' ? result($event) : result;
						`,
						context,
						element
					});

					const result = await fn(context);

					if (typeof result === 'function') {
						result(event);
					}
				});
			}
		});

		on('scope:init', (data) => processElement({ element: data.element }));

		$.AsyncFunction = AsyncFunction;
		$.createDirectiveFunction = createFunction;
		$.getPrerenderedNodes = getPrerenderedNodes;
		$.directive = directive;
	}
}
