import { AsyncFunction } from './asyncFunction';
import { bind } from './bind';
import { $config } from './config';
import { isDomReady, onDomReady } from './domReady';
import { mergeObjects } from './mergeObjects';
import { on } from './on';
import { signal } from './signal';

type DirectiveMatcher = string | RegExp

type DirectiveCallback = (data: DirectiveCallbackData) => void;

interface DirectiveCallbackData {
	el: HTMLElement
}

interface Directive {
	matcher: DirectiveMatcher
	callback: DirectiveCallback
}

interface ProcessDirectiveOptions {
	root?: HTMLElement
	matcherId?: string
}

const directives: Record<string, Directive> = {};

const processDirectives = (options: ProcessDirectiveOptions = {}): void => {
	const { root = document, matcherId } = options;
	const elements = [...root.getElementsByTagName('*')];

	if (!(root instanceof Document)) {
		elements.unshift(root);
	}

	const directivesToProcess = matcherId === undefined ? Object.values(directives) : [directives[matcherId]];
	const getParentScopeData = (el: HTMLElement, scope: Scope = { }): Scope => {
		if (el === null) {
			return scope;
		}

		if ('__signalizeScope' in el) {
			scope = mergeObjects(scope, el.__signalizeScope);
		}

		return getParentScopeData(el.parentElement, scope);
	}

	const getElementScope = (el: HTMLElement): Scope => {
		el.__signalizeScope = getParentScopeData(el);
		return el.__signalizeScope;
	}

	const processElement = async (element) => {
		let matchedDirectivesCount = 0;
		let elementScope = null;
		const directivesPromises = [];

		for (const directive of directivesToProcess) {
			if (matchedDirectivesCount >= element.attributes.length) {
				break;
			}

			if (directive.matcher instanceof RegExp) {
				for (const attribute of element.attributes) {
					const matches = attribute.name.match(directive.matcher);

					if (matches === null) {
						continue;
					}

					if (elementScope === null) {
						elementScope = getElementScope(element);
					}

					directivesPromises.push(
						directive.callback({ el: element, scope: elementScope, matches, attribute })
					);
					matchedDirectivesCount++;
				}
			} else if (directive.matcher in element.attributes) {
				if (elementScope === null) {
					elementScope = getElementScope(element);
				}

				directivesPromises.push(
					directive.callback({ el: element, scope: elementScope, attribute: element.attributes[directive.matcher]})
				);
				matchedDirectivesCount++;
			}
		}

		await Promise.all(directivesPromises);
	};

	const processElements = async () => {
		const element = elements.shift();
		await processElement(element);

		if (elements.length) {
			await processElements();
		}
	}

	processElements();
}

export const directive = (matcher: DirectiveMatcher, callback: DirectiveCallback): Promise<void> | void => {
	const matcherId = matcher.toString();

	directives[matcherId] = {
		matcher: matcher instanceof RegExp ? new RegExp(`^${matcher.source}$`) : matcher,
		callback
	}

	if (isDomReady()) {
		processDirectives({ matcherId })
	}
}

interface CreateFunctionOptions {
	functionString: string
	context: Record<string, any>
}

const createFunction = (options: CreateFunctionOptions): Promise<any> => {
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

onDomReady(() => {
	on('dom-mutation:node:added', () => {
		processDirectives();
	})

	directive(new RegExp(`(?:\\$|${$config.attributesPrefix}signal${$config.directivesSeparator})(\\S+)`), async ({ matches, el, scope, attribute }) => {
		const fn = createFunction({
			functionString: `return ${attribute.value.length ? attribute.value : "''"}`,
			context: scope
		});
		let result = await fn();

		if (typeof result === 'string' && result.length > 0 && isNaN(result) === false) {
			result = parseFloat(result);
		}

		el.__signalizeScope[matches[1]] = signal(result);
	});

	directive(new RegExp(`(?::|${$config.attributesPrefix}bind${$config.directivesSeparator})(\\S+)`), async ({ matches, el, scope, attribute }) => {
		if (el.tagName.toLowerCase() === 'template' && attribute.name.includes('for')) {
			return;
		}

		const fn = createFunction({
			functionString: `
				const result = ${attribute.value};
				return typeof result === 'function' ? result() : result;
			`,
			context: scope
		})

		let signalsToWatch = [];
		let usedSignalsCleanup = []

		for (const signal of Object.values(scope)) {
			if (typeof signal !== 'function') {
				continue;
			}

			let clean = signal.watch(() => {
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

		for (const watchCleanup of usedSignalsCleanup) {
			watchCleanup();
		}

		usedSignalsCleanup = {};
	});

	directive(new RegExp(`(?:\\@|${$config.attributesPrefix}on${$config.directivesSeparator})(\\S+)`), async ({ matches, el, scope, attribute }) => {
		on(matches[1], el, (event) => {
			const fn = createFunction({
				functionString: attribute.value,
				context: {
					event,
					...scope
				}
			});
			fn();
		});
	})

	directive(new RegExp(`(?::|${$config.attributesPrefix})for`), async ({ el, scope, attribute }) => {
		if (el.tagName.toLowerCase() !== 'template') {
			return;
		}

		const forLoopRe = /([\s\S]+)\s+(in|of)\s+([\s\S]+)/;
		const argumentsMatch = attribute.value.match(forLoopRe);

		if (argumentsMatch.length < 4) {
			throw new Error(`Invalid for loop syntax "${attribute.value}".`);
		}

		const newContextVariables = [];
		let newContextVariablesString = argumentsMatch[1];
		let matches;

		const bracketsRegExp = /^([{([])/;
		const replaceBracketsAndGetArgumentName = (bracket) => {
			newContextVariablesString = newContextVariablesString.replace(new RegExp(`(?:^${bracket}|${bracket}$)`), '');
		}

		if (bracketsRegExp.test(newContextVariablesString)) {
			//console.log('fu');
		} else {
			newContextVariables.push(newContextVariablesString);
		}

		const signalsToWatch = [];

		for (const signal of Object.values(scope)) {
			if (typeof signal !== 'function') {
				continue;
			}

			let unwatch = signal.watch(() => {
				signalsToWatch.push(signal);
				unwatch();
			}, { execution: 'onGet' })
		}

		const process = async () => {

			const fn = createFunction({
				functionString: `
					const scopes = [];
					const stack = typeof ${argumentsMatch[3]} === 'function' ? ${argumentsMatch[3]}() : ${argumentsMatch[3]};
					console.log('tu');
					for (let ${argumentsMatch[1]} ${argumentsMatch[2]} stack) {
						scopes.push({
							${newContextVariables.map((variable) => {
								return `${variable}: ${variable},`;
							})}
							...context
						})
					}

					return scopes;
				`,
				context: scope
			});

			const scopes = await fn();
			const currentState = [];
			let nextElementSibling = el.nextElementSibling;

			while (nextElementSibling !== null) {
				if (typeof nextElementSibling.__signalizeTemplate === 'undefined') {
					break;
				}

				currentState.push(nextElementSibling);
				nextElementSibling = nextElementSibling.nextElementSibling;
			}

			let lastInsertPoint = currentState[currentState.length - 1] ?? el;
			let i = 0;

			for (const scope of scopes) {
				for (const children of el.content.children) {
					const root = children.cloneNode(true);
					root.__signalizeTemplate = el;
					root.__signalizeScope = scope;
					processDirectives({ root });

					const rootKey = root.getAttribute('key')
					let existingItem = null;
					let existingItemIndex = null;

					if (rootKey) {
						existingItem = currentState.find((currentStateItem, index) => {
							let keyMatches = currentStateItem.getAttribute('key') === rootKey;
							if (keyMatches) {
								existingItemIndex = index;
							}
							return true;
						});
					} else if (i >= currentState.length) {
						//console.log('append', root);
						lastInsertPoint.after(root);
						lastInsertPoint = root;
					}
					console.log(root);

					i++;
				}
			}

			console.log(i, currentState.length);
			while(currentState.length > i) {
				let item = currentState.pop();
				item.remove();
			}
		}

		process();

		for (const signalToWatch of signalsToWatch) {
			signalToWatch.watch(() => process());
		}
	});

})
