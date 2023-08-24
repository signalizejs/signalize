import type Signalize from '..';

interface ScopeInitFunctionArguments {
	$el: HTMLElement
	ref: typeof ref
	refs: typeof refs
}

type ScopeInitFunction = (data: ScopeInitFunctionArguments) => void;

export default (signalize: Signalize): void => {
	const { mergeObjects, ref, refs, isDomReady, onDomReady, on, config, CustomEventListeners } = signalize;
	let scopeAttribute = 'scope';
	const definedScopes: Record<string, ScopeInitFunction> = {};

	const getElementData = (el: ScopeElement, data: Scope = { }): Scope => {
		if (el === null) {
			return data;
		}

		const elementScope = getScope(el);

		if (elementScope) {
			data = mergeObjects(data, elementScope.data());
		}

		return getElementData(el.parentNode, data);
	}

	class Data extends Function {
		constructor (el, defaultData) {
			super();
			return new Proxy(this, {
				get: (target, symbol) => {
					return defaultData[symbol];
				},
				set: (target, symbol, value) => {
					defaultData[symbol] = value;
					return this;
				},
				apply: () => {
					return mergeObjects(defaultData, getElementData(el.parentNode) ?? {});
				}
			})
		}
	}

	const initScope = (el: HTMLElement, data?) => {
		const scopeName = el instanceof HTMLElement ? el.getAttribute(scopeAttribute) as string : null;
		const initFn = !scopeName || !(scopeName in definedScopes) ? undefined : definedScopes[scopeName];
		const parentScopeIsEl = (refElement: HTMLElement): boolean => refElement.closest(`[${scopeAttribute}]`) === el;
		const cleanups = []

		const elementScope = {
			data: new Data(el, data ?? {}),
			el,
			cleanups,
			ref: <T extends HTMLElement>(id: string): T | null => {
				const refEl = ref<T>(id, el);
				return refEl !== null && parentScopeIsEl(refEl) ? refEl : null
			},
			refs: (id: string) => [...refs(id, el)].filter(parentScopeIsEl),
		};

		elementScope.cleanup = () => {
			for (const cleanup of elementScope.cleanups) {
				cleanup();
			}

			elementScope.cleanups = [];
		}

		/* on('remove', el, () => {
			for (const cleanup of elementScope.cleanups) {
				cleanup();
			}
		}) */

		el.__signalizeScope = elementScope;

		if (initFn !== undefined) {
			initFn(elementScope);
		}

		return elementScope;
	}

	const getScope = (element: HTMLElement | Document | DocumentFragment) => element?.__signalizeScope;

	const initScopes = (root: HTMLElement, name?: string): void => {
		const selector = name !== undefined ? `[${scopeAttribute}="${name}"]` : `[${scopeAttribute}]`;
		for (const el of root.querySelectorAll<HTMLElement>(selector)) {
			initScope(el);
		}
	}

	const scope = (name: string, init: ScopeInitFunction): void => {
		if (name in definedScopes) {
			throw new Error(`Scope "${name}" already defined.`);
		}

		definedScopes[name] = init;

		if (isDomReady()) {
			initScopes(document.documentElement, name);
		}
	};

	onDomReady(() => {
		scopeAttribute = `${config.attributesPrefix}${scopeAttribute}`;

		initScopes(document.documentElement);

		on('dom-mutation:node:removed', (event) => {
			const node = event.detail;
			const nodeScope = getScope(node);

			if (nodeScope === undefined) {
				return;
			}

			for (const cleanup of nodeScope.cleanups) {
				cleanup();
			}
		});

		on('dom-mutation:node:added' as keyof CustomEventListener, document, ({ detail }: { detail: Node }): void => {
			if (!(detail instanceof HTMLElement)) {
				return;
			}

			initScopes(detail);
		});
	});

	signalize.scope = scope;
	signalize.initScope = initScope;
	signalize.getScope = getScope

}
