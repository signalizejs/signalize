import type Signalize from '..';

declare module '..' {
	interface Signalize {
		scope: (nameOrElement: string | HTMLElement | Document | DocumentFragment, init: ScopeInitFunction) => void | ScopeInstance
	}
}

type ScopeInitFunction = (Scope: Scope) => void;

class Scope {
	element: HTMLElement | Document | DocumentFragment;
	data;
	#cleanups = new Set<CallableFunction>();

	constructor ({
		signalize,
		element,
		init,
		data = {}
	}: {
		signalize: Signalize
		element: HTMLElement | Document | DocumentFragment
		init: CallableFunction
		data?: Record<string, any>
	}) {
		const { on, merge, CallableClass } = signalize;
		this.element = element;

		const getElementData = (element, data = {}): Scope => {
			if (element === null) {
				return data;
			}

			const elementScope = element.__signalizeScope;

			if (elementScope !== undefined) {
				data = merge(data, elementScope.data());
			}

			return getElementData(element.parentNode, data);
		}

		class CallableData extends CallableClass {
			get(target, key, receiver) {
				return data[key];
			}
			set(target, key, newValue) {
				data[key] = newValue;
				return true;
			}
			apply() {
				return merge(data, getElementData(element.parentNode))
			}
		}

		this.data = new CallableData();
		this.element.__signalizeScope = this;

		init(this);
	}

	cleanup (callback: CallableFunction): void {
		if (callback === undefined) {
			for (const cleanup of this.#cleanups) {
				cleanup();
			}

			this.#cleanups.clear();
			return;
		}

		this.#cleanups.add(callback);
	}

	ref<T extends HTMLElement>(id: string): T | null {
		const refEl = ref<T>(id, this.element);
		return refEl !== null && this.#parentScopeIsEl(refEl) ? refEl : null
	}

	refs (id: string): HTMLElement[] {
		return [...refs(id, this.element)].filter(this.#parentScopeIsEl)
	}

	#parentScopeIsEl (): boolean {
		return (refElement: HTMLElement): boolean => refElement.closest(`[${scopeAttribute}]`) === el;
	}
}

export interface ScopeInstance extends Scope {}

export default (signalize: Signalize): void => {
	const { isDomReady, onDomReady, on, config } = signalize;
	const scopeKey = '__signalizeScope';
	let scopeAttribute = 'scope';
	const definedScopes: Record<string, ScopeInitFunction> = {};

	const initScope = (element: HTMLElement, init?): void => {
		if (element[scopeKey] !== undefined) {
			init(element[scopeKey]);
			return;
		}

		new Scope({
			signalize,
			init,
			element
		});
	}

	const initScopes = (root: HTMLElement, name?: string): void => {
		const selector = name !== undefined ? `[${scopeAttribute}="${name}"]` : `[${scopeAttribute}]`;
		for (const el of root.querySelectorAll<HTMLElement>(selector)) {
			initScope(el);
		}
	}

	const scope = (nameOrElement: string | HTMLElement | Document | DocumentFragment, init: ScopeInitFunction): void | undefined | Scope => {
		const nameOrElementIsString = typeof nameOrElement === 'string';
		const name = nameOrElementIsString ? nameOrElement : undefined;
		const element = !nameOrElementIsString ? nameOrElement : undefined;

		if (element !== undefined && init === undefined) {
			return element[scopeKey];
		}

		if (name !== undefined && name in definedScopes) {
			throw new Error(`Scope "${name}" is already defined.`);
		}

		if (name !== undefined) {
			definedScopes[name] = init;
		}

		if (isDomReady()) {
			if (name !== undefined) {
				initScopes(document.documentElement, name)
			} else {
				initScope(element, init);
			}
		}

		return element.__signalizeScope;
	};

	onDomReady(() => {
		scopeAttribute = `${config.attributesPrefix}${scopeAttribute}`;

		initScopes(document.documentElement);

		const cleanScope = (element: HTMLElement | DocumentFragment | Document) => {
			const elementScope = scope(element);
			if (elementScope !== undefined) {
				elementScope.cleanup();
			}

			for (const child of element.children) {
				cleanScope(child);
			}
		};

		on('dom-mutation:node:removed', (event) => {
			setTimeout(() => {
				if (event.detail instanceof HTMLElement) {
					cleanScope(event.detail)
				}
			}, 0);
		});

		on('dom-mutation:node:added' as keyof CustomEventListener, document, ({ detail }: { detail: Node }): void => {
			if (!(detail instanceof HTMLElement)) {
				return;
			}

			if (scope(detail)) {
				return;
			}

			initScopes(detail);
		});
	});

	signalize.scope = scope;
	signalize.initScope = initScope;
}
