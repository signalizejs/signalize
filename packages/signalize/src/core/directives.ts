import type Signalize from '..';

type DirectiveCallback = (data: DirectiveCallbackData) => Promise<void> | void;

interface DirectiveCallbackData {
	el: HTMLElement
	matches: RegExpMatchArray
	attribute: Attr
	scope: () => Scope
}

interface Directive {
	matcher?: RegExp | string
	setup?: CallableFunction
	callback: DirectiveCallback
}

interface ProcessDirectiveOptions {
	root?: HTMLElement
	directiveName?: string
}

interface CreateFunctionOptions {
	functionString: string
	context: Record<string, any>
}

interface Scope extends Record<string, any> {}

export default (signalize: Signalize): void => {
	const {
		AsyncFunction,
		Signal,
		bind,
		isDomReady,
		on,
		dispatch,
		onDomReady,
		getScope,
		initScope,
		signal,
		config,
	} = signalize;
	const directives: Record<string, Directive> = {};
	let cloakAttribute = 'cloak';
	let ignoreAttribute = 'ignore';
	let inited = false;

	const processElement = async (el: HTMLElement, directivesToProcess): Promise<void> => {
		directivesToProcess = directivesToProcess ?? Object.keys(directives);

		const directivesQueue = [...directivesToProcess];
		const directivesMatchersRegExpString = directivesQueue.map((directiveName) => {
			const matcher = directives[directiveName].matcher;
			return matcher instanceof RegExp ? matcher.source : matcher
		}).join('|');
		const re = new RegExp(directivesMatchersRegExpString);

		const processDirective = async (directiveName: string, attribute, matches): Promise<void> => {
			const canBeProcessed = dispatch('directive:beforeProcess', {
				directiveName,
				attribute,
				el
			});

			if (!canBeProcessed) {
				return;
			}

			const directive = directives[directiveName];

			const elementScope = getScope(el) ?? initScope(el);
			directive.callback({ ...elementScope, matches, attribute });

			const scope = getScope(el);

			if (typeof scope.directives === 'undefined') {
				scope.directives = [];
			}

			getScope(el).directives.push(directiveName);
		}

		const directivesPromises = [];
		if (directivesQueue.length > 0) {
			for (const attribute of el.attributes) {
				if (attribute.name in directivesQueue) {
					directivesPromises.push(processDirective(attribute.name, attribute));
				} else if (re.test(attribute.name)) {
					for (const directiveName of directivesQueue) {
						if (!(directives[directiveName].matcher instanceof RegExp)) {
							continue;
						}

						const matches = directives[directiveName].matcher.exec(attribute.name);
						if (matches) {
							directivesPromises.push(processDirective(directiveName, attribute, matches));
							break;
						}
					}
				}
			}

			el.removeAttribute(cloakAttribute);
		}

		await Promise.all(directivesPromises);

		return el;
	};

	const processDirectives = async (options: ProcessDirectiveOptions = {}): Promise<HTMLElement | Document | DocumentFragment> => {
		const { root = document, directiveName } = options;
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

			for (const children of root.children) {
				elementsProcessingPromises.push(processElements(children));
			}

			await Promise.all(elementsProcessingPromises);
		}

		await processElements(root);

		return root;
	}

	const directive = (name: string, data: Directive): void => {
		if (name in directives) {
			throw new Error(`Directive "${name}" already defined.`);
		}

		if (!('matcher' in data)) {
			data.matcher = `${config.attributesPrefix}${name}`;
		}

		directives[name] = data;

		if (typeof data.setup === 'function') {
			data.setup();
		}

		if (isDomReady() && inited) {
			void processDirectives({ directiveName: name })
		}
	}

	signalize.directive = directive;

	const createFunctionCache = {};

	const createFunction = (options: CreateFunctionOptions): typeof AsyncFunction => {
		const { functionString, context = {} } = options;
		const cacheKey = `${options.functionString.replace(/\s*/g, '_')}-${Object.keys(options.context).join('-')}`;

		if (!(cacheKey in createFunctionCache)) {
			createFunctionCache[cacheKey] = new AsyncFunction('_context', `
				try {
					let { ${Object.keys(context).join(',')} } = _context;
					${functionString}
				} catch(e) {
					console.error(e);
				}
			`)
		}
		return createFunctionCache[cacheKey];
	}

	onDomReady(async () => {
		cloakAttribute = `${config.attributesPrefix}${cloakAttribute}`;
		ignoreAttribute = `${config.attributesPrefix}${ignoreAttribute}`;

		directive('signal', {
			matcher: new RegExp(`(?:\\$|${config.attributesPrefix}signal${config.directivesSeparator})(\\S+)`),
			callback: async ({ matches, el, data, attribute }): Promise<void> => {
				const currentData = data();
				const fn = createFunction({
					functionString: `return ${attribute.value.length ? attribute.value : "''"}`,
					context: currentData
				});
				let result = await fn(currentData);

				if (typeof result === 'string' && result.length > 0 && !isNaN(result)) {
					result = parseFloat(result);
				}

				getScope(el).data[matches[1]] = signal(result);
			}
		});

		directive('for', {
			matcher: new RegExp(`(?::|${config.attributesPrefix})for`),
			setup: () => {
				on('directive:beforeProcess', (event) => {
					const { directiveName, attribute, el } = event.detail;
					if (directiveName === 'bind' && attribute.name.includes('for') && el.tagName.toLocaleLowerCase() === 'template') {
						event.preventDefault();
					}
				});
			},
			callback: async ({ el, data, attribute }) => {
				if (el.tagName.toLowerCase() !== 'template') {
					return;
				}

				const forLoopRe = /([\s\S]+)\s+(in|of)\s+([\s\S]+)/;
				const argumentsMatch = attribute.value.match(forLoopRe);

				if (argumentsMatch.length < 4) {
					throw new Error(`Invalid for loop syntax "${attribute.value}".`);
				}

				const newContextVariables: string[] = argumentsMatch[1].replace(/[[({})\]\s]/g, '').split(',');

				let unwatchSignalCallbacks = [];

				const process = async (): Promise<void> => {
					const currentData = data();
					const signalsToWatch = [];

					for (const signal of Object.values(currentData)) {
						if (typeof signal !== 'function') {
							continue;
						}

						const unwatch = signal.watch(() => {
							signalsToWatch.push(signal);
							unwatch();
						}, { execution: 'onGet' })
					}
					const directivesProcessingPromises = [];
					const processScope = async (scope) => {
						const templateFragment = el.cloneNode(true).content;
						for (const child of templateFragment.children) {
							initScope(child, { ...scope, ...currentData });
							directivesProcessingPromises.push(processElement(child));
						}
					}

					const stackFn = createFunction({
						functionString: `return typeof ${argumentsMatch[3]} === 'function' ? ${argumentsMatch[3]}() : ${argumentsMatch[3]};`,
						context: {
							...currentData
						}
					});
					let stack = await stackFn({
						...currentData
					});

					if (typeof stack === 'number') {
						stack = [...Array(stack).keys()];
					}

					let totalCount = stack.length;
					let counter = 1;
					const isArrayDestruct = argumentsMatch[0].trim().startsWith('[');
					const iterate = (data, stack) => {
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
							...currentData,
							...destruct,
							iterator: {
								count: counter,
								first: counter === 1,
								last: counter === totalCount,
								odd: counter % 2 !== 0,
								even: counter % 2 === 0
							}
						});
					}

					if (argumentsMatch[2] === 'in') {
						for (let data in stack) {
							iterate(data, stack)
						}
					} else {
						for (let data of stack) {
							iterate(data, stack)
						}
					}

					const currentState = [];
					let nextElementSibling = el.nextElementSibling;

					while (nextElementSibling !== null) {
						if (getScope(nextElementSibling)?.template !== el) {
							break;
						}

						currentState.push(nextElementSibling);
						nextElementSibling = nextElementSibling.nextElementSibling;
					}

					let lastInsertPoint = currentState[currentState.length - 1] ?? el;
					let i = 0;

					const fragments = await Promise.all(directivesProcessingPromises);

					const reinitDirectives = (el) => {
						const scope = getScope(el);
						if (scope !== undefined && scope?.directives !== undefined) {
							scope.cleanup();
							const directivesQueue = scope.directives;
							scope.directives = [];
							processElement(el,directivesQueue);
						}

						for (const child of el.children) {
							reinitDirectives(child);
						}
					}

					while (fragments.length > 0) {
						const root = fragments.shift();
						getScope(root).template = el;
						const rootKey = root.getAttribute('key')
						let existingItem = null;
						let existingItemIndex = null;

						if (rootKey) {
							existingItem = currentState.find((currentStateItem, index) => {
								const keyMatches = currentStateItem.getAttribute('key') === rootKey;
								if (keyMatches) {
									existingItemIndex = index;
								}
								return true;
							});
							// Todo přesunout položku a její potomky v indexech
						} else if (currentState.length > 0 && i < currentState.length) {
							const scope = getScope(currentState[i]);

							for (const [key, value] of Object.entries(getScope(root).data())) {
								scope.data[key] = value;
							}

							scope.data = getScope(root).data;
							reinitDirectives(currentState[i]);

							lastInsertPoint = currentState[i];
						} else if (currentState.length === 0 || i >= currentState.length) {
							lastInsertPoint.after(root);
							lastInsertPoint = root;

							for (const child of root.children) {
								initScope(child, getScope(root).data());
								processDirectives({ root: child });
							}
						}

						i++;
					}

					while (currentState.length > i) {
						const item = currentState.pop();
						getScope(item).cleanup();
						item.remove();
					}

					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}

					unwatchSignalCallbacks = [];
					for (const signalToWatch of signalsToWatch) {
						unwatchSignalCallbacks.push(signalToWatch.watch(process))
					}
				}

				await process();

				getScope(el).cleanups.push(() => {
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				})
			}
		})

		directive('if', {
			matcher: new RegExp(`(?::|${config.attributesPrefix})if`),
			setup: () => {
				on('directive:beforeProcess', (event) => {
					const { directiveName, attribute } = event.detail;
					if (directiveName !== 'if' && attribute.name.includes('if')) {
						event.preventDefault();
					}
				});
			},
			callback: async ({ matches, el, data, attribute }) => {
				const fn = createFunction({
					functionString: `return ${attribute.value}`,
					context: data()
				});
				const signalsToWatch = [];

				for (const signal of Object.values(data())) {
					if (!(signal instanceof Signal)) {
						continue;
					}

					const unwatch = signal.watch(() => {
						signalsToWatch.push(signal);
						unwatch();
					}, { execution: 'onGet' })
				}

				const cleanup = (): void => {
					let nextElementSibling = el.nextElementSibling;

					while (nextElementSibling !== null) {
						const elementScope = getScope(nextElementSibling);
						if (elementScope?.condition !== el) {
							break;
						}

						const elementToRemove = nextElementSibling;
						nextElementSibling = nextElementSibling.nextElementSibling;
						elementScope.cleanup();
						elementToRemove.remove();
					}
				}

				const render = async (): Promise<void> => {
					const conditionResult = await fn(data());
					let lastInsertPoint = el;

					if (conditionResult === true && getScope(el.nextElementSibling)?.condition === el) {
						return;
					}

					if (conditionResult !== true) {
						cleanup();
						return;
					}

					let fragment = el.cloneNode(true).content;

					initScope(fragment, data());
					fragment = await processDirectives({ root: fragment });
					const children = [...fragment.children];
					while (children.length > 0) {
						const root = children.shift();
						getScope(root).condition = el;
						lastInsertPoint.after(root);
						lastInsertPoint = root;
					}
				}

				await render();

				const unwatchSignalCallbacks = [];

				for (const signalToWatch of signalsToWatch) {
					unwatchSignalCallbacks.push(signalToWatch.watch(render));
				}

				getScope(el).cleanups.push(() => {
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				})
			}
		})

		directive('bind', {
			matcher: new RegExp(`(?::|${config.attributesPrefix}bind${config.directivesSeparator})(\\S+)`),
			callback: async ({ matches, el, data, attribute }) => {
				const currentData = data();
				const fn = createFunction({
					functionString: `
						const result = ${attribute.value};
						return typeof result === 'function' ? result() : result;
					`,
					context: currentData
				})

				const signalsToWatch = [];

				for (const signal of Object.values(currentData)) {
					if (!(signal instanceof Signal)) {
						continue;
					}

					const clean = signal.watch(() => {
						signalsToWatch.push(signal);
						clean();
					}, { execution: 'onGet' })
				}

				fn(currentData);

				bind(el, {
					[matches[1]]: [...signalsToWatch, () => fn(currentData)]
				});
			}
		})

		directive('on', {
			matcher: new RegExp(`(?:\\@|${config.attributesPrefix}on${config.directivesSeparator})(\\S+)`),
			callback: async (scope) => {
				const { matches, el, data, attribute } = scope;
				on(matches[1], el, (event) => {
					const currentData = data();
					const fn = createFunction({
						functionString: attribute.value,
						context: {
							event,
							...currentData
						}
					});
					fn({
						event,
						...currentData
					});
				});
			}
		})

		await processDirectives();

		inited = true;

		on('dom-mutation:node:added', (event) => {
			const node = event.detail;
			if (!(node instanceof HTMLElement)) {
				return;
			}

			if (getScope(node) !== undefined) {
				return;
			}

			void processDirectives({ root: event.detail });
		});
	})

}
