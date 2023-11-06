import type { Signalize, Scope } from 'signalizejs'

declare module '..' {
	interface Signalize {
		directive: (name: string, data: Directive) => void
		createDirectiveFunction: (options: CreateFunctionOptions) => () => Promise<any>
		AsyncFunction: () => Promise<any>
	}

	interface SignalizeConfig {
		directivesRenderedBlockStart: string
		directivesRenderedBlockEnd: string
	}
}

type DirectiveCallback = (data: DirectiveCallbackData) => Promise<void> | void;

interface DirectiveCallbackData extends Scope {
	element: HTMLElement
	matches: RegExpMatchArray
	attribute: Attr
}

interface DirectiveMatcherParameters {
	element: HTMLElement
	attribute: Attr
}

type DirectiveMatcherReturn = RegExp | undefined

type DirectiveMatcher = (params: DirectiveMatcherParameters) => DirectiveMatcherReturn

interface Directive {
	matcher?: RegExp | DirectiveMatcher
	callback: DirectiveCallback
}

interface RegisteredDirective extends Directive {
	matcher?: DirectiveMatcher
}

interface ProcessDirectiveOptions {
	root?: HTMLElement
	directiveName?: string
}

interface CreateFunctionOptions {
	functionString: string
	context: Record<string, any>
	element?: HTMLElement | Document | DocumentFragment
}

export default ($: Signalize): void => {
	$.on('signalize:ready', () => {
		const { bind, on, Signal, scope, signal, config, globals } = $;
		const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
		const directives: Record<string, RegisteredDirective> = {};
		const directivesAttribute = `${config.attributePrefix}directives`;
		const ignoreAttribute = `${directivesAttribute}${config.attributeSeparator}ignore`;
		const orderAttribute = `${directivesAttribute}${config.attributeSeparator}order`
		const renderedTemplateStartComment = config.directivesRenderedBlockStart ?? 'template';
		const renderedTemplateEndComment = config.directivesRenderedBlockEnd ?? '/template';
		let inited = false;

		const processElement = async (element: HTMLElement, directivesToProcess?: string[]): Promise<HTMLElement> => {
			const elementClosestScope = element.closest(`[${config.scopeAttribute}]`);
			let scopeInitPromise = null;

			if (elementClosestScope && typeof elementClosestScope[config.scopeKey] === 'undefined') {
				scopeInitPromise = new Promise((resolve) => {
					on('scope:inited', ({ detail }) => {
						if (detail.element === elementClosestScope) {
							resolve(true);
						}
					})
				})
			}

			if (scopeInitPromise instanceof Promise) {
				await scopeInitPromise;
			}

			let directivesQueue = [...directivesToProcess ?? Object.keys(directives)];
			const customDirectivesOrder = element.getAttribute(orderAttribute) ?? '';

			if (customDirectivesOrder.length > 0) {
				directivesQueue = [...new Set([
					...customDirectivesOrder.split(',').map((item) => item.trim()).filter((item) => item.length > 0),
					...directivesQueue
				])]
			}

			if (directivesQueue.length > 0) {
				let countdown = element.attributes.length;
				const processDirectiveFromQueue = async (directiveName: string): Promise<void> => {
					if (directiveName === undefined) {
						return;
					}

					const matcher = directives[directiveName]?.matcher
					let directivesPromises = [];
					for (const attribute of element.attributes) {
						const matcherReturn = matcher({ element, attribute });

						if (matcherReturn === undefined) {
							continue;
						}

						const matches = matcherReturn.exec(attribute.name);
						if (matches === null) {
							continue;
						}

						const directive = directives[directiveName];
						const elementScope = scope(element, (elementScope) => {
							if (!('directives' in elementScope)) {
								elementScope.directives = new Set();
							}

							elementScope.directives.add(directiveName);
						});

						countdown --;
						directivesPromises.push(
							directive.callback({
								...elementScope,
								data: elementScope.data,
								matches,
								attribute
							})
						)
					}

					if (directivesPromises.length > 0) {
						await Promise.all(directivesPromises);
					}

					if (countdown === 0) {
						return;
					}

					return processDirectiveFromQueue(directivesQueue.shift());
				}

				await processDirectiveFromQueue(directivesQueue.shift());

				element.removeAttribute(config.cloakAttribute);
			}

			return element;
		};

		const processDirectives = async (options: ProcessDirectiveOptions = {}): Promise<HTMLElement | Document | DocumentFragment> => {
			const { root = config.root, directiveName } = options;
			const directivesToProcess = directiveName === undefined ? Object.keys(directives) : [directiveName];

			const processElements = async (root): Promise<void> => {
				const rootIsHtmlElement = root instanceof HTMLElement;

				if (rootIsHtmlElement && root?.closest(`[${ignoreAttribute}]`)) {
					return;
				}

				if (rootIsHtmlElement) {
					await processElement(root, directivesToProcess);
				}

				const elementsProcessingPromises = []

				for (const child of [...root.children]) {
					elementsProcessingPromises.push(processElements(child));
				}

				await Promise.all(elementsProcessingPromises);
			}

			await processElements(root);

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
				const functionDataKeys = Object.keys({ ...globals, ...context });
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
			return createFunctionCache[cacheKey].bind(undefined)
		}

		directive('signal', {
			matcher: new RegExp(`(?:\\$|${config.attributePrefix}signal${config.attributeSeparator})(\\S+)`),
			callback: async ({ matches, element, data, attribute }): Promise<void> => {
				const fn = createFunction({
					functionString: `return ${attribute.value.length ? attribute.value : "''"}`,
					context: data,
					element
				});
				let result = await fn(data);

				if (typeof result === 'string' && result.length > 0 && !isNaN(result)) {
					result = parseFloat(result);
				}

				scope(element).data[matches[1]] = signal(result);
			}
		});

		directive('for', {
			matcher: ({ element }) => {
				if (element.tagName.toLocaleLowerCase() !== 'template') {
					return;
				}

				return new RegExp(`(?::|${config.attributePrefix})for`);
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

				let unwatchSignalCallbacks = [];
				const signalsToWatch = [];

				for (const signal of Object.values(data)) {
					if (typeof signal !== 'function') {
						continue;
					}

					const unwatch = signal.watch(() => {
						signalsToWatch.push(signal);
						unwatch();
					}, { execution: 'onGet' })
				}

				const stackFn = createFunction({
					functionString: `return typeof ${argumentsMatch[3]} === 'function' ? ${argumentsMatch[3]}() : ${argumentsMatch[3]};`,
					context: data,
					element
				});

				const process = async (): Promise<void> => {
					const directivesProcessingPromises = [];
					const processScope = async (scopeToProcess) => {
						const templateFragment = element.cloneNode(true).content;
						for (const child of templateFragment.children) {
							scope(child, ({ data }) => {
								for (const [key, value] of Object.entries({ ...scopeToProcess, ...data })) {
									data[key] = value;
								}
							});
							directivesProcessingPromises.push(processElement(child));
						}
					}

					let stack = await stackFn(data);

					if (typeof stack === 'number') {
						stack = [...Array(stack).keys()];
					}

					let totalCount = stack.length;
					let counter = 0;
					const isArrayDestruct = argumentsMatch[0].trim().startsWith('[');
					const iterate = (data: any): void => {
						let destruct = {};

						if (newContextVariables.length > 1) {
							if (isArrayDestruct) {
								for (const key of Object.keys(data)) {
									destruct[newContextVariables[key]] = data[key];
								}
							} else {
								for (const key of newContextVariables) {
									destruct[key] = data[key];
								}
							}
						} else {
							destruct[newContextVariables] = data;
						}

						void processScope({
							...destruct,
							iterator: {
								count: counter,
								first: counter === 0,
								last: counter === totalCount,
								odd: counter % 2 !== 0,
								even: counter % 2 === 0
							}
						});
					}

					if (argumentsMatch[2] === 'in') {
						for (let data in stack) {
							iterate(data)
						}
					} else {
						for (let data of stack) {
							iterate(data)
						}
					}

					const currentState = [];
					let nextElementSibling = element.nextElementSibling;

					while (nextElementSibling !== null) {
						if (scope(nextElementSibling)?.template !== element) {
							break;
						}

						currentState.push(nextElementSibling);
						nextElementSibling = nextElementSibling.nextElementSibling;
					}

					let lastInsertPoint = currentState[currentState.length - 1] ?? element;
					let i = 0;

					const fragments = await Promise.all(directivesProcessingPromises);

					const reinitDirectives = (element) => {
						const elementScope = scope(element);
						if (elementScope !== undefined && elementScope?.directives !== undefined) {
							elementScope.cleanup();
							const directivesQueue = elementScope.directives;
							elementScope.directives.clear();
							processElement(element, directivesQueue);
						}

						for (const child of element.children) {
							reinitDirectives(child);
						}
					}

					const fragmentsLength = fragments.length;
					while (fragments.length > 0) {
						const root = fragments.shift();
						scope(root, (rootScope) => {
							rootScope.template = element;
						});
						const rootKey = root.getAttribute('key')
						let existingItem = null;
						let existingItemIndex = null;

						if (rootKey) {
							existingItem = currentState.find((currentStateItem, index) => {
								const keyMatches = currentStateItem.getAttribute('key') === rootKey;
								if (keyMatches) {
									existingItemIndex = index;
								}
								return keyMatches;
							});

							if (existingItem) {
								if (existingItemIndex > i && currentState[i] !== undefined) {
									if (i === 0) {
										const tmp = currentState[i];
										currentState[i].before(existingItem);
										currentState[i] = existingItem;
										currentState[existingItemIndex] = tmp;
									} else {
										const tmp = currentState[i];
										currentState[i - 1].after(existingItem);
										currentState[i] = existingItem
										currentState[existingItemIndex] = tmp;
									}
								}
							} else if (i >= currentState.length) {
								lastInsertPoint.after(root);
								lastInsertPoint = root;
								for (const child of root.children) {
									scope(child, ({ data }) => {
										data = scope(root).data
									});

									processDirectives({ root: child });
								}
							} else {
								currentState[i].before(root);
								processDirectives({ root: root });
							}
						} else if (currentState.length > 0 && i < currentState.length) {
							const fragmentScope = scope(currentState[i]);

							for (const [key, value] of Object.entries(scope(root).data)) {
								fragmentScope.data[key] = value;
							}

							reinitDirectives(currentState[i]);

							lastInsertPoint = currentState[i];
						} else if (currentState.length === 0 || i >= currentState.length) {
							lastInsertPoint.after(root);
							lastInsertPoint = root;
							for (const child of root.children) {
								scope(child, ({ data }) => {
									data = scope(root).data
								});

								processDirectives({ root: child });
							}
						}
						i++;
					}

					nextElementSibling = element.nextElementSibling;
					let removeId = 0;

					while (nextElementSibling !== null) {
						if (scope(nextElementSibling)?.template !== element) {
							break;
						}

						const nextElementToRemove = nextElementSibling.nextElementSibling;

						if (removeId >= fragmentsLength) {
							nextElementSibling.remove();
						}

						nextElementSibling = nextElementToRemove;
						removeId++;
					}
				}

				await process();

				unwatchSignalCallbacks = [];
				for (const signalToWatch of signalsToWatch) {
					unwatchSignalCallbacks.push(signalToWatch.watch(process))
				}

				scope(element).cleanup(() => {
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				})
			}
		});

		directive('if', {
			matcher: ({ element }) => {
				if (element.tagName.toLowerCase() !== 'template') {
					return;
				}

				return new RegExp(`(?::|${config.attributePrefix})if`);
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
				const signalsToWatch = [];

				for (const signal of Object.values(data)) {
					if (!(signal instanceof Signal)) {
						continue;
					}

					const unwatch = signal.watch(() => {
						signalsToWatch.push(signal);
						unwatch();
					}, { execution: 'onGet' })
				}

				let nextSibling = element.nextSibling;
				const nextSiblingScope = scope(nextSibling);
				let rendered = nextSiblingScope?.template === element;
				const renderedElements = [];

				if (rendered === false) {
					let renderedTemplateSibling = element.nextSibling;
					let renderedTemplateOpenned = false;

					while (renderedTemplateSibling) {
						if (!renderedTemplateOpenned && renderedTemplateSibling.nodeType === Node.TEXT_NODE && renderedTemplateSibling.textContent.trim().length > 0) {
							break;
						}

						if (renderedTemplateSibling.nodeType === Node.COMMENT_NODE) {
							const content = renderedTemplateSibling.textContent?.trim();
							if (content === renderedTemplateStartComment) {
								rendered = true;
								renderedElements.push(renderedTemplateSibling);
								renderedTemplateOpenned = true;
								renderedTemplateSibling = renderedTemplateSibling.nextSibling;
								continue;
							} else if (content === renderedTemplateEndComment) {
								renderedElements.push(renderedTemplateSibling);
								renderedTemplateOpenned = false;
								break;
							}
						}

						if (renderedTemplateOpenned) {
							renderedElements.push(renderedTemplateSibling);
						}

						renderedTemplateSibling = renderedTemplateSibling.nextSibling;
					}
				}

				const cleanElements = () => {
					while (renderedElements.length) {
						renderedElements.pop().remove()
					}
				}

				const render = async (): Promise<void> => {
					const conditionResult = await fn(data);
					let lastInsertPoint = element;

					if (conditionResult === true && rendered === true) {
						return;
					}

					if (conditionResult !== true) {
						cleanElements();
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
					const children = [...fragment.childNodes];

					while (children.length > 0) {
						const root = children.shift();
						renderedElements.push(root);
						lastInsertPoint.after(root);
						lastInsertPoint = root;
					}

					rendered = true;
				}

				await render();

				const unwatchSignalCallbacks = [];

				while (signalsToWatch.length) {
					unwatchSignalCallbacks.push(signalsToWatch.pop().watch(render));
				}

				scope(element).cleanup(() => {
					cleanElements();
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

				return new RegExp(`(?::|${config.attributePrefix}bind${config.attributeSeparator})(\\S+)|(\\{([^{}]+)\\})`)
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

				let signalsToWatch = [];

				for (const signal of Object.values(data)) {
					if (!(signal instanceof Signal)) {
						continue;
					}

					const unwatch = signal.watch(() => {
						signalsToWatch.push(signal);
						unwatch();
					}, { execution: 'onGet' })
				}

				fn(data);

				bind(element, {
					[attributeName]: [...signalsToWatch, () => fn(data)]
				});
			}
		});

		directive('on', {
			matcher: new RegExp(`(?:\\@|${config.attributePrefix}on${config.attributeSeparator})(\\S+)`),
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
		})

		on('dom:ready', async () => {
			await processDirectives();

			inited = true;

			on('dom:mutation:node:added', (event) => {
				const node = event.detail;
				if (!(node instanceof HTMLElement) || scope(node)?.directives !== undefined) {
					return;
				}

				void processDirectives({ root: event.detail });
			});
		})

		$.AsyncFunction = AsyncFunction;
		$.createDirectiveFunction = createFunction;
		$.directive = directive;
	})
}
