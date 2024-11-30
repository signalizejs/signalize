/**
 * @type {import('../../types/Signalize').Module<
 *   import('../../types/modules/directives').DirectivesModule,
 *   import('../../types/modules/directives').DirectivesModuleConfig
 * >}
 */
export default async ($, config) => {
	const { resolve, params } = $;
	const { attributePrefix, attributeSeparator } = params;

	const { on, scope, traverseDom, evaluate, bind, Signal } = await resolve(
		'bind',
		'dom/traverser',
		'event', 'evaluator',
		'scope', 'signal',
	);

	/** @type {Record<string, import('../../types/modules/directives').RegisteredDirective} */
	const directivesRegister = {};
	const directivesAttribute = `${attributePrefix}directives`;
	const ignoreAttribute = `${directivesAttribute}${attributeSeparator}ignore`;
	const orderAttribute = `${directivesAttribute}${attributeSeparator}order`;
	const renderedTemplateStartComment = config?.prerenderedBlockStart ?? 'prerendered';
	const renderedTemplateEndComment = config?.prerenderedBlockEnd ?? '/prerendered';

	/**
	 * @param {import('../../types/modules/directives').ProcessElementOptions} options
	 * @returns {Promise<Element>}
	 */
	const processElement = async (options) => {
		const element = options.element;
		let elementScope = scope(element);

		const compiledDirectives = elementScope?.$directives ?? new Map();

		let directivesQueue = [...options.$directives ?? Object.keys(directivesRegister)];
		const customDirectivesOrder = element.getAttribute(orderAttribute) ?? '';

		if (customDirectivesOrder.length > 0) {
			directivesQueue = [...new Set([
				...customDirectivesOrder.split(',').map((item) => item.trim()).filter((item) => item.length > 0),
				...directivesQueue
			])];
		}

		directivesQueue = directivesQueue.filter((item) => !compiledDirectives.has(item));
		let countdown = element.attributes.length;

		if (elementScope.$directives === undefined) {
			while (directivesQueue.length && countdown) {
				const directiveName = directivesQueue.shift();
				const matcher = directivesRegister[directiveName]?.matcher;

				for (const attribute of element.attributes) {
					if (scope(element).$processedDirectiveAttributes?.includes(attribute.name)) {
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

					elementScope = scope(element, (node) => {
						if (node?.$directives === undefined) {
							node.$processedDirectiveAttributes = [];
							node.$directives = new Map();
						}
					});

					countdown--;

					elementScope.$processedDirectiveAttributes.push(attribute.name);

					elementScope.$directives.set(
						directiveName,
						[
							...elementScope.$directives.get(directiveName) ?? [],
							({ elementScope }) => {
								const result = directivesRegister[directiveName].callback({
									scope: elementScope,
									matches,
									attribute
								});

								return result;
							}
						]
					);
				}
			}
		}

		const directivesToRun = [...elementScope?.$directives?.keys() ?? []];

		/**
		 * @param {string} name
		 * @returns {Promise<void>}
		 */
		const runDirective = async (name) => {
			const promises = [];

			for (const directiveFunction of elementScope.$directives.get(name)) {
				promises.push(directiveFunction({ elementScope }));
			}

			await Promise.all(promises);
		};

		while (directivesToRun.length) {
			await runDirective(directivesToRun.shift());
		}

		return element;
	};

	/**
	 * @param {Element} element
	 * @returns
	 */
	const isElementWebComponent = (element) => element.tagName.includes('-');

	/** @type {import('../../types/modules/directives').ProcessDirectives} */
	const processDirectives = async (options) => {
		const root = options.root;
		let directives = options?.directives;
		directives = directives ?? Object.keys(directivesRegister);

		const rootScope = scope(root);

		await traverseDom(
			root,
			async (node) => {
				const nodeIsRoot = node === root;
				if (node?.closest(`[${ignoreAttribute}]`)) {
					return false;
				}

				const isNestedWebComponent = isElementWebComponent(node);

				if (!nodeIsRoot) {
					scope(node, (elScope) => {
						if (isNestedWebComponent) {
							elScope._parentComponent = root;
						} else {
							elScope.$parentScope = rootScope;
							elScope.$data = rootScope.$data;
						}
					});
				}

				await processElement({
					element: node,
					directives,
				});

				// Detect, if node is custom element.
				// If so, then quit iteration after passing props above in process element.
				return isNestedWebComponent && !nodeIsRoot ? false : true;
			},
			[1]
		);
	};

	/** @type {import('../../types/modules/directives').directive} */
	const directive = (name, { matcher, callback }) => {
		if (name in directivesRegister) {
			throw new Error(`Directive "${name}" already defined.`);
		}

		directivesRegister[name] = {
			callback,
			matcher: typeof matcher === 'function' ? matcher : () => matcher
		};
	};

	/** @type {import('../../types/modules/directives').getPrerenderedNodes} */
	const getPrerenderedNodes = (element) => {
		const renderedNodes = [];
		let renderedTemplateSibling = element.nextSibling;
		let renderedTemplateOpenned = false;

		while (renderedTemplateSibling) {
			if (!renderedTemplateOpenned
				&& renderedTemplateSibling.nodeType === Node.TEXT_NODE
				&& renderedTemplateSibling.textContent.trim().length > 0
			) {
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
	};

	directive('bind', {
		matcher: ({ element, attribute }) => {
			if ([':for', ':if'].includes(attribute.name) && element.tagName.toLowerCase() === 'template') {
				return;
			}

			return new RegExp(`(?::|${attributePrefix}bind${attributeSeparator})([\\S-]+)|(\\{([^{}]+)\\})`);
		},
		callback: async (data) => {
			const { matches, attribute } = data;
			const elementScope = data.scope;
			const { $el } = elementScope;
			const isShorthand = attribute.name.startsWith('{');
			const attributeValue = isShorthand ? matches[3] : attribute.value;
			const attributeName = isShorthand ? matches[3] : matches[1];
			const isProperty = elementScope?.$props?.[attributeName] !== undefined;
			/** @type {Signal<any>[]} */
			let trackedSignals = [];

			const get = (trackSignals) => {
				const { result, detectedSignals } = evaluate(
					attributeValue,
					{
						$el,
						...isProperty && elementScope._parentComponent !== undefined ? scope(elementScope._parentComponent) : elementScope
					},
					trackSignals
				);

				if (trackSignals) {
					trackedSignals = detectedSignals;
				}

				return result;
			};

			const value = get(true);

			if (elementScope?.$props?.[attributeName] === undefined) {
				bind($el, {
					[attributeName]: [
						...trackedSignals,
						{
							get, value,
							set: (value) => {
								trackedSignals[trackedSignals.length - 1]?.(value)
							}
						}
					]
				});
				return;
			}

			if (elementScope._parentComponent === undefined) {
				return;
			}

			const valueIsSignal = value instanceof Signal;

			if (!valueIsSignal) {
				elementScope?.$props?.[attributeName](value);
				return;
			}

			let setting = false;

			value.watch(({ newValue }) => {
				if (setting) {
					return;
				}

				setting = true;
				elementScope?.$props?.[attributeName](newValue);
				setting = false;
			}, { immediate: true });

			elementScope?.$props?.[attributeName].watch(({ newValue }) => {
				if (setting) {
					return;
				}

				setting = true;
				value(newValue);
				setting = false;
			});
		}
	});

	directive('on', {
		matcher: new RegExp(`(?:\\@|${attributePrefix}on${attributeSeparator})(\\S+)`),
		callback: async ({ matches, scope, attribute }) => {
			on(matches[1], scope.$el, async (event) => {
				const { result } = evaluate(attribute.value, {
					...scope,
					$event: event
				});
				if (typeof result === 'function') {
					result(event);
				}
			});
		}
	});

	directive('for', {
		matcher: ({ element }) => {
			if (element.tagName.toLocaleLowerCase() !== 'template') {
				return;
			}

			return new RegExp(`(?::|${attributePrefix})for`);
		},
		callback: async (data) => {
			const { forDirective } = await resolve('directives/for');
			await forDirective(data);
		}
	});

	directive('if', {
		matcher: ({ element }) => {
			if (element.tagName.toLowerCase() !== 'template') {
				return;
			}

			return new RegExp(`(?::|${attributePrefix})if`);
		},
		callback: async (data) => {
			const { ifDirective } = await resolve('directives/if');
			await ifDirective(data);
		}
	});

	on('component:setuped', async (event) => await processDirectives({ root: event.detail.$el }));

	return {
		getPrerenderedNodes,
		processDirectives,
		directive
	};
};
