/* declare module '..' {
	interface Signalize {
		directive: (name: string, data: Directive) => void
		getPrerenderedNodes: (element: Element) => Node[]
		processDirectives: (options?: ProcessDirectiveOptions) => Promise<void>
	}
} */

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
 * @interface DirectiveCallbackData
 * @extends {Scope}
 * @property {RegExpMatchArray} matches - The result of matching a regular expression against an attribute value.
 * @property {Attr} attribute - The attribute associated with the directive.
 */

/**
 * Represents parameters for a directive matcher.
 *
 * @interface DirectiveMatcherParameters
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
 * @interface ProcessElementOptions
 * @property {Element} element - The HTML element to be processed.
 * @property {'init' | 'reinit'} mode - The mode of processing (init or reinit).
 */

/**
 * Represents a directive, consisting of a matcher and a callback.
 *
 * @interface Directive
 * @property {RegExp | DirectiveMatcher | undefined} [matcher] - The matcher for the directive.
 * @property {DirectiveCallback} callback - The callback function for the directive.
 */

/**
 * Represents a registered directive, consisting of a matcher and a callback.
 *
 * @interface RegisteredDirective
 * @extends {Directive}
 * @property {DirectiveMatcher} [matcher] - The matcher function for the directive.
 */

/**
 * Represents options for processing directives within a DOM tree.
 *
 * @interface ProcessDirectiveOptions
 * @property {Element} root - The root element of the DOM tree to process.
 * @property {string[]} [directives] - An array of directive names to process (optional).
 * @property {'init' | 'reinit'} [mode] - The mode of processing (init or reinit, optional).
 * @property {boolean} [onlyRoot] - Indicates whether to process directives only within the root element (optional).
 */

/**
 * Represents options for configuring a plugin related to directives.
 *
 * @interface PluginOptions
 * @property {string} [prerenderedBlockStart] - The start marker for prerendered blocks (optional).
 * @property {string} [prerenderedBlockEnd] - The end marker for prerendered blocks (optional).
 */

export default async ($, pluginOptions) => {
	const { resolve, params } = $;
	const signalizeRoot = $.root;
	const { attributePrefix, attributeSeparator } = params;
	const { on, scope, traverseDom, evaluate, bind } = await resolve(
		'event', 'scope', 'traverse-dom', 'evaluate', 'bind'
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
		/** @type {Element} */
		const element = options.element;
		const mode = options.mode ?? 'init';
		const canExecute = ['reinit', 'init'].includes(mode);
		const canCompile = mode === 'init';
		let elementScope = scope(element);

		if (mode === 'reinit') {
			elementScope.$cleanup();
		}

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
		const processedAttributes = [];

		if (canCompile) {
			while (directivesQueue.length && countdown) {
				const directiveName = directivesQueue.shift();
				const matcher = directivesRegister[directiveName]?.matcher;

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

					elementScope = scope(element, (node) => {
						if (node?.$directives === undefined) {
							node.$directives = new Map();
						}
					});

					countdown--;

					processedAttributes.push(attribute.name);
					elementScope.$directives.set(
						directiveName,
						[
							...elementScope.$directives.get(directiveName) ?? [],
							(elementScope) => directivesRegister[directiveName].callback({
								scope: elementScope,
								matches,
								attribute
							})
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
				promises.push(directiveFunction(elementScope));
			}

			await Promise.all(promises);
		};

		while (canExecute && directivesToRun.length > 0) {
			await runDirective(directivesToRun.shift());
		}

		return element;
	};

	/**
	 * Asynchronously processes directives within a DOM tree based on the specified options.
	 *
	 * @function
	 * @param {ProcessDirectiveOptions} [options={}] - Options for processing directives within the DOM tree (optional).
	 * @returns {Promise<void>} A promise that resolves once the directive processing is complete.
	 */
	const processDirectives = async (options = {}) => {
		let { root, directives, mode = 'init', onlyRoot } = options;
		directives = directives ?? Object.keys(directivesRegister);

		if (onlyRoot === true) {
			await processElement({ element: root, mode, directives });
			return;
		}

		const rootScope = scope(root);

		await traverseDom(
			root,
			async (node) => {
				const nodeIsRoot = node === root;

				if (node?.closest(`[${ignoreAttribute}]`)) {
					return false;
				}

				/* if (scope(node)?.$directives !== undefined && mode !== 'reinit') {
					return false;
				} */

				if (!nodeIsRoot) {
					scope(node, (elScope) => {
						elScope.$data = { ...elScope.$data, ...rootScope.$data };
						elScope.$parentScope = rootScope;
					});
				}

				await processElement({ element: node, mode, directives });

				return node.tagName.includes('-') && !nodeIsRoot ? false : true;
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

			return new RegExp(`(?::|${attributePrefix}bind${attributeSeparator})(\\S+)|(\\{([^{}]+)\\})`);
		},
		callback: async ({ matches, scope, attribute }) => {
			const { $el } = scope;
			const isShorthand = attribute.name.startsWith('{');
			const attributeValue = isShorthand ? matches[3] : attribute.value;
			const attributeName = isShorthand ? matches[3] : matches[1];
			let trackedSignals = [];
			const get = (trackSignals) => {
				const { result, signalsToWatch } = evaluate(attributeValue, scope, trackSignals);

				if (trackSignals) {
					trackedSignals = signalsToWatch;
				}

				return result;
			};

			const value = get(true);

			bind($el, {
				[attributeName]: [
					...trackedSignals,
					{ get, value, set: (value) => trackedSignals[trackedSignals.length - 1](value) ?? null }
				]
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

	on('component:setuped', (event) => {
		processDirectives({ root: event.detail.$el });
	});

	return {
		getPrerenderedNodes,
		processDirectives,
		directive
	};
};
