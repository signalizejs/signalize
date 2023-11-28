import type { Signalize, SignalizePlugin, Scope } from '..'

declare module '..' {
	interface Signalize {
		directive: (name: string, data: Directive) => void
		getPrerenderedNodes: (element: Element) => Node[]
		directiveFunction: (options: CreateFunctionOptions) => () => Promise<any>
		processDirectives: (options?: ProcessDirectiveOptions) => Promise<void>
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
	root: Element
	directives?: string[]
	mode?: 'init' | 'reinit'
	onlyRoot?: boolean
}

interface CreateFunctionOptions {
	functionString: string
	context: Record<string, any>
	element?: Element | Document | DocumentFragment
}

interface PluginOptions {
	prerenderedBlockStart?: string
	prerenderedBlockEnd?: string
}

export default (pluginOptions?: PluginOptions): SignalizePlugin => {
	return ($: Signalize) => {
		const { on, scope, globals, attributePrefix, attributeSeparator } = $;
		const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
		const directivesRegister: Record<string, RegisteredDirective> = {};
		const directivesAttribute = `${attributePrefix}directives`;
		const ignoreAttribute = `${directivesAttribute}${attributeSeparator}ignore`;
		const orderAttribute = `${directivesAttribute}${attributeSeparator}order`
		const renderedTemplateStartComment = pluginOptions?.prerenderedBlockStart ?? 'prerendered';
		const renderedTemplateEndComment = pluginOptions?.prerenderedBlockEnd ?? '/prerendered';
		let inited = false;

		const processElement = async (options?: ProcessElementOptions): Promise<Element> => {
			const element: Element = options.element;
			const mode = options.mode ?? 'init';
			const canExecute = ['reinit', 'init'].includes(mode);
			const canCompile = mode === 'init';

			const elementClosestScope = element.closest(`[${$.scopeAttribute}]`);

			if (elementClosestScope && scope(elementClosestScope[$.scopeKey]) === undefined) {
				return element;
			}

			let elementScope = scope(element);

			if (mode === 'reinit') {
				elementScope.cleanup();
			}

			const compiledDirectives = elementScope?.directives ?? new Map();

			let directivesQueue = [...options.directives ?? Object.keys(directivesRegister)];
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
					const matcher = directivesRegister[directiveName]?.matcher

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
						const directive = directivesRegister[directiveName];
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

			return element;
		};

		const processDirectives = async (options?: ProcessDirectiveOptions = {}): Promise<void> => {
			let { root, directives, mode = 'init', onlyRoot } = options;
			directives = directives ?? Object.keys(directivesRegister);

			if (onlyRoot === true) {
				await processElement({ element: root, mode, directives })
				return;
			}

			await $.traverseDom(
				root,
				async (node) => {
					if (node?.closest(`[${ignoreAttribute}]`)) {
						return;
					}
					await processElement({ element: node, mode, directives });
				},
				[1]
			);
		}

		const directive = (name: string, { matcher, callback }: Directive): void => {
			if (name in directivesRegister) {
				throw new Error(`Directive "${name}" already defined.`);
			}

			directivesRegister[name] = {
				callback,
				matcher: typeof matcher === 'function' ? matcher : () => matcher
			}

			if (inited) {
				void processDirectives({ root: $.root, directives: [name] })
			}
		}

		const createFunctionCache = {};

		const createFunction = (options: CreateFunctionOptions): typeof AsyncFunction => {
			const { functionString, context = {} } = options;
			const cacheKey = `${options.functionString.replace(/\s*/g, '_')}-${Object.keys(options.context).join('-')}`;
			if (!(cacheKey in createFunctionCache)) {
				const functionDataKeys = Object.keys({ $, ...globals, ...context });
				createFunctionCache[cacheKey] = async (data: Record<string, any>) => {
					let functionData = { $, ...globals, ...data }
					try {
						return new AsyncFunction('$context', '$el', `
							'use strict';
							try {
								let { ${functionDataKeys.join(',')} } = $context;
								${functionString}
							} catch(e) {
								console.error($el ?? '', e);
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

		const getPrerenderedNodes = (element: Element): Node[] => {
			const renderedNodes = [];
			let renderedTemplateSibling = element.nextSibling;
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
			matcher: new RegExp(`(?:\\$|${$.attributePrefix}signal${$.attributeSeparator})(\\S+)`),
			callback: async ({ matches, element, data, attribute }): Promise<void> => {
				const prepareValue = (value) => {
					return typeof value === 'string' && value.length > 0 && !isNaN(value)
						? parseFloat(value)
						: value;
				}
				const fnSharedPart = `
					let __result = ${attribute.value.length ? attribute.value : "''"};
					__result = __result instanceof $.Signal ? __result() : __result;
				`;
				const { signalsToWatch, result } = await $.directiveFunction({
					functionString: `
						const __getSignalsToWatch = $.observeSignals($context);
						${fnSharedPart}
						return { result: __result, signalsToWatch: __getSignalsToWatch() }
					`,
					context: data,
					element
				})(data);

				const newSignal = $.signal(prepareValue(result));

				const unwatchSignalCallbacks = [];

				for (const signalToWatch of signalsToWatch) {
					unwatchSignalCallbacks.push(signalToWatch.watch(async () => {
						const result = await $.directiveFunction({
							functionString: `
								${fnSharedPart}
								return __result;
							`,
							context: data,
							element
						})(data);

						newSignal(prepareValue(result));
					}))
				}

				$.scope(element, ({ data, cleanup }) => {
					data[matches[1]] = newSignal;
					cleanup(() => {
						while (unwatchSignalCallbacks.length > 0) {
							unwatchSignalCallbacks.shift()()
						}
					})
				})
			}
		});

		directive('bind', {
			matcher: ({ element, attribute }) => {
				if ([':for', ':if'].includes(attribute.name) && element.tagName.toLowerCase() === 'template') {
					return;
				}

				return new RegExp(`(?::|${$.attributePrefix}bind${$.attributeSeparator})(\\S+)|(\\{([^{}]+)\\})`)
			},
			callback: async ({ matches, element, data, attribute }) => {
				const isShorthand = attribute.name.startsWith('{');
				const attributeValue = isShorthand ? matches[3] : attribute.value;
				const attributeName = isShorthand ? matches[3] : matches[1];
				const fnSharedPart = `
					let __result = ${attributeValue};
					__result = typeof __result === 'function' ? await __result() : __result;
				`
				const signalsToWatch = await $.directiveFunction({
					functionString: `
						const __getSignalsToWatch = $.observeSignals($context);
						${fnSharedPart}
						return __getSignalsToWatch();
					`,
					context: data,
					element
				})(data);

				$.bind(element, {
					[attributeName]: [
						...signalsToWatch,
						async () => await $.directiveFunction({
							functionString: `
								${fnSharedPart}
								return __result;
							`,
							context: data,
							element
						})(data)
					]
				});
			}
		});

		directive('on', {
			matcher: new RegExp(`(?:\\@|${$.attributePrefix}on${$.attributeSeparator})(\\S+)`),
			callback: async (scope) => {
				const { matches, element, data, attribute } = scope;

				$.on(matches[1], element, async (event) => {
					const context = {
						$event: event,
						...data
					}

					const fn = $.directiveFunction({
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
		$.directiveFunction = createFunction;
		$.getPrerenderedNodes = getPrerenderedNodes;
		$.processDirectives = processDirectives;
		$.directive = directive;
	}
}
