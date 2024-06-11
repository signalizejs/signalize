/**
 * Represents a callback function for a directive.
 *
 * @typedef {function} DirectiveCallback
 * @param {DirectiveCallbackData} data - Data related to the directive callback.
 * @returns {Promise<void> | void} A promise or void representing the result of the directive callback.
 */

/**
 * Represents data passed to a directive callback.
 *
 * @typedef DirectiveCallbackData
 * @extends {Scope}
 * @property {RegExpMatchArray} matches - The result of matching a regular expression against an attribute value.
 * @property {Attr} attribute - The attribute associated with the directive.
 */

/**
 * Represents parameters for a directive matcher.
 *
 * @typedef DirectiveMatcherParameters
 * @property {Element} element - The HTML element associated with the directive.
 * @property {Attr} attribute - The attribute associated with the directive.
 */

/**
 * Represents the return type of a directive matcher.
 *
 * @typedef {(RegExp | undefined)} DirectiveMatcherReturn
 */

/**
 * Represents a directive matcher function.
 *
 * @typedef {function} DirectiveMatcher
 * @param {DirectiveMatcherParameters} params - Parameters for the directive matcher.
 * @returns {DirectiveMatcherReturn} The regular expression or undefined returned by the directive matcher.
 */

/**
 * Represents options for processing an HTML element in the context of directives.
 *
 * @typedef ProcessElementOptions
 * @property {Element} element - The HTML element to be processed.
 */

/**
 * Represents a directive, consisting of a matcher and a callback.
 *
 * @typedef Directive
 * @property {RegExp | DirectiveMatcher | undefined} [matcher] - The matcher for the directive.
 * @property {DirectiveCallback} callback - The callback function for the directive.
 */

/**
 * Represents a registered directive, consisting of a matcher and a callback.
 *
 * @typedef RegisteredDirective
 * @extends {Directive}
 * @property {DirectiveMatcher} [matcher] - The matcher function for the directive.
 */

/**
 * Represents options for processing directives within a DOM tree.
 *
 * @typedef ProcessDirectiveOptions
 * @property {Element} root - The root element of the DOM tree to process.
 * @property {string[]} [directives] - An array of directive names to process (optional).
 * @property {boolean} [onlyRoot] - Indicates whether to process directives only within the root element (optional).
 */

/**
 * Represents options for configuring a plugin related to directives.
 *
 * @typedef PluginOptions
 * @property {string} [prerenderedBlockStart] - The start marker for prerendered blocks (optional).
 * @property {string} [prerenderedBlockEnd] - The end marker for prerendered blocks (optional).
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ($, pluginOptions) => {
	const { resolve, params } = $;
	const signalizeRoot = $.root;
	const { attributePrefix, attributeSeparator } = params;
	const { on, scope, traverseDom, evaluate, bind, Signal } = await resolve(
		'bind', 'event', 'evaluate', 'scope', 'signal', 'traverse-dom'
	);

	/** @type {Record<string, RegisteredDirective} */
	const directivesRegister = {};
	const directivesAttribute = `${attributePrefix}directives`;
	const ignoreAttribute = `${directivesAttribute}${attributeSeparator}ignore`;
	const orderAttribute = `${directivesAttribute}${attributeSeparator}order`;
	const renderedTemplateStartComment = pluginOptions?.prerenderedBlockStart ?? 'prerendered';
	const renderedTemplateEndComment = pluginOptions?.prerenderedBlockEnd ?? '/prerendered';
	let inited = false;

	/**
	 *
	 * @param {ProcessElementOptions} options
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
								let result = directivesRegister[directiveName].callback({
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

	/**
	 * Asynchronously processes directives within a DOM tree based on the specified options.
	 *
	 * @function
	 * @param {ProcessDirectiveOptions} [options={}] - Options for processing directives within the DOM tree (optional).
	 * @returns {Promise<void>} A promise that resolves once the directive processing is complete.
	 */
	const processDirectives = async (options = {}) => {
		let { root, directives } = options;
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

	/**
	 * Defines a custom directive with the specified name, matcher, and callback.
	 *
	 * @function
	 * @param {string} name - The name of the custom directive.
	 * @param {Directive} options - An object containing the matcher and callback for the directive.
	 * @param {RegExp | DirectiveMatcher | undefined} [options.matcher] - The matcher for the directive (optional).
	 * @param {DirectiveCallback} options.callback - The callback function for the directive.
	 * @returns {void}
	 */
	const directive = (name, { matcher, callback }) => {
		if (name in directivesRegister) {
			throw new Error(`Directive "${name}" already defined.`);
		}

		directivesRegister[name] = {
			callback,
			matcher: typeof matcher === 'function' ? matcher : () => matcher
		};

		if (inited) {
			void processDirectives({ root: signalizeRoot, directives: [name] });
		}
	};

	/**
	 * Retrieves prerendered nodes from the specified HTML element.
	 *
	 * @function
	 * @param {Element} element - The HTML element to retrieve prerendered nodes from.
	 * @returns {Node[]} An array of nodes representing the prerendered content.
	 */
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
							set: (value) => trackedSignals[trackedSignals.length - 1](value) ?? null
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
