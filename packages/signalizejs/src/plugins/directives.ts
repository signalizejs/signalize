import type { Signalize, SignalizePlugin, Scope } from '..'

declare module '..' {
	interface Signalize {
		directive: (name: string, data: Directive) => void
		getPrerenderedNodes: (element: Element) => Node[]
		processDirectives: (options?: ProcessDirectiveOptions) => Promise<void>
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

interface PluginOptions {
	prerenderedBlockStart?: string
	prerenderedBlockEnd?: string
}

export default (pluginOptions?: PluginOptions): SignalizePlugin => {
	return ($: Signalize) => {
		const { on, vnode, attributePrefix, attributeSeparator } = $;
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
			let elementVnode = vnode(element);

			if (mode === 'reinit') {
				elementVnode.cleanup();
			}

			const compiledDirectives = elementVnode?.directives ?? new Map();

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

						elementVnode = vnode(element, (elVnode) => {
							elVnode.context = {
								...elVnode.context,
								...element.getRootNode() instanceof Document ? element.closest('[component]') : vnode(element.getRootNode())?.context
							}
						});

						if (elementVnode?.directives === undefined) {
							elementVnode.directives = new Map();
						}

						countdown--;

						processedAttributes.push(attribute.name);
						elementVnode.directives.set(
							directiveName,
							[
								...elementVnode.directives.get(directiveName) ?? [],
								(elementVnode) => {
									return directivesRegister[directiveName].callback({
										...elementVnode,
										matches,
										attribute
									})
								}
							]
						);
					}
				}
			}

			const directivesToRun = [...elementVnode?.directives?.keys() ?? []]

			const runDirective = async (name: string): Promise<void> => {
				const promises = [];

				for (const directiveFunction of elementVnode.directives.get(name)) {
					promises.push(directiveFunction(elementVnode));
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

		directive('bind', {
			matcher: ({ element, attribute }) => {
				if ([':for', ':if'].includes(attribute.name) && element.tagName.toLowerCase() === 'template') {
					return;
				}

				return new RegExp(`(?::|${$.attributePrefix}bind${$.attributeSeparator})(\\S+)|(\\{([^{}]+)\\})`)
			},
			callback: async ({ matches, node, context, attribute }) => {
				const isShorthand = attribute.name.startsWith('{');
				const attributeValue = isShorthand ? matches[3] : attribute.value;
				const attributeName = isShorthand ? matches[3] : matches[1];
				const contextValue = context[attributeValue];

				const processDataValue = (): any => {
					return typeof contextValue === 'function' ? contextValue.call(context) : contextValue;
				}

				const getSignalsToWatch = $.observeSignals(context);
				processDataValue()
				const signalsToWatch = getSignalsToWatch();
				$.bind(node, {
					[attributeName]: [
						...signalsToWatch,
						processDataValue
					]
				});
			}
		});

		directive('on', {
			matcher: new RegExp(`(?:\\@|${$.attributePrefix}on${$.attributeSeparator})(\\S+)`),
			callback: async ({ matches, node, context, attribute }) => {
				$.on(matches[1], node, async (event) => {
					context[attribute.value].call(context, event);
				});
			}
		});

		on('component:constructed', (event) => {
			processDirectives({ root: event.detail })
		});

		$.getPrerenderedNodes = getPrerenderedNodes;
		$.processDirectives = processDirectives;
		$.directive = directive;
	}
}
