import { AsyncFunction } from './asyncFunction';
import { bind } from './bind';
import { $config } from './config';
import { dispatch } from './dispatch';
import { isDomReady, onDomReady } from './domReady';
import { mergeObjects } from './mergeObjects';
import { on } from './on';
import { signal } from './signal';

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

interface ScopeElement extends ParentNode {
	__signalizeScope: Scope
}

interface Scope extends Record<string, any> {}

const directives: Record<string, Directive> = {};
let inited = false;

const processDirectives = async (options: ProcessDirectiveOptions = {}): Promise<HTMLElement | Document | DocumentFragment> => {
	const { root = document, directiveName } = options;
	const directivesToProcess = directiveName === undefined ? Object.keys(directives) : [directiveName];
	const getParentScopeData = (el: ScopeElement, scope: Scope = { }): Scope => {
		if (el === null) {
			return scope;
		}

		if ('__signalizeScope' in el) {
			scope = mergeObjects(scope, el.__signalizeScope);
		}

		return getParentScopeData(el.parentNode, scope);
	}

	const getElementScope = (el: HTMLElement): Scope => {
		const scopeElement = el as ScopeElement;
		scopeElement.__signalizeScope = getParentScopeData(scopeElement);
		return scopeElement.__signalizeScope;
	}

	const processElement = async (el: HTMLElement): Promise<void> => {
		let matchedDirectivesCount = 0;
		const directivesQueue = [...directivesToProcess];

		const processDirective = async (directiveName: string): Promise<void> => {
			const directive = directives[directiveName];
			const directiveData = {
				el,
				scope: () => getElementScope(el)
			}

			if (directive.matcher instanceof RegExp) {
				for (const attribute of el.attributes) {
					const canBeProcessed = dispatch('directive:beforeProcess', {
						directiveName,
						attribute,
						el
					});

					if (!canBeProcessed) {
						continue;
					}

					const matches = attribute.name.match(directive.matcher);

					if (matches === null) {
						continue;
					}

					await directive.callback({ ...directiveData, matches, attribute });
					matchedDirectivesCount++;
				}
			} else if (directive.matcher in el.attributes) {
				const canBeProcessed = dispatch('directive:beforeProcess', {
					directiveName,
					attribute: el.attributes[directiveName],
					el
				});

				if (!canBeProcessed) {
					return;
				}

				await directive.callback({ ...directiveData, attribute: el.attributes[directive.matcher] })

				matchedDirectivesCount++;
			}

			if (matchedDirectivesCount >= el.attributes.length || directivesQueue.length === 0) {
				el.removeAttribute(`${$config.attributesPrefix}cloak`);
				return;
			}

			await processDirective(directivesQueue.shift());
		}

		if (directivesQueue.length > 0) {
			await processDirective(directivesQueue.shift());
		}
	};

	const processElements = async (root): Promise<void> => {
		const rootIsHtmlElement = root instanceof HTMLElement;

		if (rootIsHtmlElement && root?.closest(`[${$config.attributesPrefix}ignore]`)) {
			return;
		}

		if (rootIsHtmlElement) {
			await processElement(root);
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

export const directive = (name: string, data: Directive): void => {
	if (name in directives) {
		throw new Error(`Directive "${name}" already defined.`);
	}

	if (!('matcher' in data)) {
		data.matcher = `${$config.attributesPrefix}${name}`;
	}

	directives[name] = data;

	if (typeof data.setup === 'function') {
		data.setup();
	}

	if (isDomReady() && inited) {
		void processDirectives({ directiveName: name })
	}
}

interface CreateFunctionOptions {
	functionString: string
	context: Record<string, any>
}

const createFunction = (options: CreateFunctionOptions): typeof AsyncFunction => {
	const { functionString, context = {} } = options;
	let fn = new AsyncFunction('');

	try {
		fn = () => {
			return new AsyncFunction('context', `
				let { ${Object.keys(context).join(',')} } = context;
				${functionString}
			`).call(null, context);
		}
	} catch (e) {
		console.error(e);
	}

	return fn;
}

onDomReady(async () => {
	// Todo scope přejmenovat na context
	directive('signal', {
		matcher: new RegExp(`(?:\\$|${$config.attributesPrefix}signal${$config.directivesSeparator})(\\S+)`),
		callback: async ({ matches, el, scope, attribute }): Promise<void> => {
			const fn = createFunction({
				functionString: `return ${attribute.value.length ? attribute.value : "''"}`,
				context: scope()
			});
			let result = await fn();

			if (typeof result === 'string' && result.length > 0 && !isNaN(result)) {
				result = parseFloat(result);
			}

			el.__signalizeScope[matches[1]] = signal(result);
		}
	});

	directive('for', {
		matcher: new RegExp(`(?::|${$config.attributesPrefix})for`),
		setup: () => {
			on('directive:beforeProcess', (event) => {
				const { directiveName, attribute, el } = event.detail;
				if (directiveName === 'bind' && attribute.name.includes('for') && el.tagName.toLocaleLowerCase() === 'template') {
					event.preventDefault();
				}
			})
		},
		callback: async ({ el, scope, attribute }) => {
			if (el.tagName.toLowerCase() !== 'template') {
				return;
			}

			const forLoopRe = /([\s\S]+)\s+(in|of)\s+([\s\S]+)/;
			const argumentsMatch = attribute.value.match(forLoopRe);

			if (argumentsMatch.length < 4) {
				throw new Error(`Invalid for loop syntax "${attribute.value}".`);
			}

			const newContextVariables: string[] = [];
			let newContextVariablesString = argumentsMatch[1];
			let matches;

			const bracketsRegExp = /^([{([])/;
			const replaceBracketsAndGetArgumentName = (bracket) => {
				newContextVariablesString = newContextVariablesString.replace(new RegExp(`(?:^${bracket}|${bracket}$)`), '');
			}

			if (bracketsRegExp.test(newContextVariablesString)) {
				// TODO destruct of arguments
			} else {
				newContextVariables.push(newContextVariablesString);
			}

			const signalsToWatch = [];

			for (const signal of Object.values(scope())) {
				if (typeof signal !== 'function') {
					continue;
				}

				const unwatch = signal.watch(() => {
					signalsToWatch.push(signal);
					unwatch();
				}, { execution: 'onGet' })
			}

			const process = async (): Promise<void> => {
				const fn = createFunction({
					functionString: `
						const scopes = [];
						const stack = typeof ${argumentsMatch[3]} === 'function' ? ${argumentsMatch[3]}() : ${argumentsMatch[3]};

						for (let ${argumentsMatch[1]} ${argumentsMatch[2]} stack) {
							scopes.push({
								${newContextVariables.map((variable) => {
									return `${variable}: ${variable},`;
								}).join('\n')}
								...context
							})
						}

						return scopes;
					`,
					context: scope()
				});

				const scopes = await fn();
				const currentState = [];
				let nextElementSibling = el.nextElementSibling;

				while (nextElementSibling !== null) {
					if (nextElementSibling.__signalizeTemplate !== el) {
						break;
					}

					currentState.push(nextElementSibling);
					nextElementSibling = nextElementSibling.nextElementSibling;
				}

				let lastInsertPoint = currentState[currentState.length - 1] ?? el;
				let i = 0;

				const directivesProcessingPromises = [];
				for (const scope of scopes) {
					const templateFragment = el.cloneNode(true).content
					templateFragment.__signalizeScope = scope;
					directivesProcessingPromises.push(processDirectives({ root: templateFragment }));
				}

				const fragments = await Promise.all(directivesProcessingPromises);

				for (const fragment of fragments) {
					for (const child of fragment.children) {
						const root = child.cloneNode(true);
						root.__signalizeTemplate = el;
						const rootKey = root.getAttribute('key')
						let existingItem = null;
						let existingItemIndex = null;
						// Todo přesunout položku a její potomky v indexech

						if (rootKey) {
							existingItem = currentState.find((currentStateItem, index) => {
								const keyMatches = currentStateItem.getAttribute('key') === rootKey;
								if (keyMatches) {
									existingItemIndex = index;
								}
								return true;
							});
						} else if (i >= currentState.length) {
							lastInsertPoint.after(root);
							lastInsertPoint = root;
						}

						i++;
					}
				}

				while (currentState.length > i) {
					const item = currentState.pop();
					item.remove();
				}
			}

			await process();

			for (const signalToWatch of signalsToWatch) {
				signalToWatch.watch(async () => { await process(); });
			}
		}
	})

	directive('if', {
		matcher: new RegExp(`(?::|${$config.attributesPrefix})if`),
		setup: () => {
			on('directive:beforeProcess', (event) => {
				const { directiveName, attribute } = event.detail;
				if (directiveName !== 'if' && attribute.name.includes('if')) {
					event.preventDefault();
				}
			});
		},
		callback: async ({ matches, el, scope, attribute }) => {
			const fn = createFunction({
				functionString: `return ${attribute.value}`,
				context: scope()
			});
			const signalsToWatch = [];

			for (const signal of Object.values(scope())) {
				if (typeof signal !== 'function') {
					continue;
				}

				const unwatch = signal.watch(() => {
					signalsToWatch.push(signal);
					unwatch();
				}, { execution: 'onGet' })
			}

			const cleanup = () => {
				let nextElementSibling = el.nextElementSibling;

				while (nextElementSibling !== null) {
					if (nextElementSibling.__signalizeCondition !== el) {
						break;
					}

					const elementToRemove = nextElementSibling;
					nextElementSibling = nextElementSibling.nextElementSibling;
					elementToRemove.remove();
				}
			}

			const render = async (): Promise<void> => {
				const conditionResult = await fn();
				let lastInsertPoint = el;

				if (conditionResult === true && el.nextElementSibling?.__signalizeCondition === el) {
					return;
				}

				if (conditionResult !== true) {
					cleanup();
					return;
				}

				let fragment = el.content;
				fragment.__signalizeScope = scope();
				fragment = await processDirectives({ root: fragment });

				for (const child of fragment.children) {
					const root = child.cloneNode(true);
					root.__signalizeCondition = el;
					root.__signalizeScope = scope();
					lastInsertPoint.after(root);
					lastInsertPoint = root;
				}
			}

			await render();

			for (const signalToWatch of signalsToWatch) {
				signalToWatch.watch(render);
			}
		}
	})

	directive('bind', {
		matcher: new RegExp(`(?::|${$config.attributesPrefix}bind${$config.directivesSeparator})(\\S+)`),
		callback: async ({ matches, el, scope, attribute }) => {
			const fn = createFunction({
				functionString: `
					const result = ${attribute.value};
					return typeof result === 'function' ? result() : result;
				`,
				context: scope()
			})

			const signalsToWatch = [];

			for (const signal of Object.values(scope())) {
				if (typeof signal !== 'function') {
					continue;
				}

				const clean = signal.watch(() => {
					signalsToWatch.push(signal);
					clean();
				}, { execution: 'onGet' })
			}

			fn();

			const bindAttribute = () => {
				bind(el, {
					[matches[1]]: [...signalsToWatch, fn]
				});
			}

			bindAttribute();
		}
	})

	directive('on', {
		matcher: new RegExp(`(?:\\@|${$config.attributesPrefix}on${$config.directivesSeparator})(\\S+)`),
		callback: async ({ matches, el, scope, attribute }) => {
			on(matches[1], el, (event) => {
				const fn = createFunction({
					functionString: attribute.value,
					context: {
						event,
						...scope()
					}
				});
				fn();
			});
		}
	})

	await processDirectives();

	inited = true;

	on('dom-mutation:node:added', () => {
		//void processDirectives();
	});
})
