import type { Signalize } from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		scope: (nameOrElement: string | Element | Document | DocumentFragment, init: ScopeInitFunction) => undefined | Scope
	}

	interface CustomEventListeners {
		'scope:inited': CustomEventListener
		'scope:defined': CustomEventListener
	}

	interface SignalizeConfig {
		scopeAttribute: string
		refAttribute: string
		scopeKey: string
	}
}

type ScopeInitFunction = (Scope: Scope) => void | Promise<void>;

export class Scope {
	readonly #signalize: Signalize;
	readonly #cleanups = new Set<CallableFunction>();
	readonly #localData = {};

	element: Element | Document | DocumentFragment;

	constructor ({
		signalize,
		element
	}: {
		signalize: Signalize
		element: Element | Document | DocumentFragment
	}) {
		const { config } = signalize;
		this.element = element;
		this.#signalize = signalize;
		this.element[config.scopeKey] = this;
	}

	set data (newValue) {
		this.#localData = newValue;
	}

	get data() {
		const { scope, merge } = this.#signalize;
		const getScopedData = (element, data = {}) => {
			if (element === null) {
				return data;
			}


			return merge(data, scope(element)?.data ?? getScopedData(element.parentNode, data))
		}
		const getParentData = (element, key: string): any => {
			if (element === null) {
				return;
			}

			return element[this.#signalize.config.scopeKey] === undefined ? getParentData(element.parentNode, key) : scope(element).data[key];
		}

		const setParentData = (element, key: string, value: any) => {
			if (element === null) {
				return false;
			}

			if (element[this.#signalize.config.scopeKey] !== undefined) {
				this.#signalize.scope(element).data[key] = value;
			} else {
				setParentData(element.parentNode, key, value);
			}
		}

		return new Proxy(getScopedData(this.element.parentNode, this.#localData), {
			set: (target, key: string, newValue: any) => {
				this.#localData[key] = newValue;
				return true;
			},
			get: (target, key) => {
				return this.#localData[key] ?? getParentData(this.element.parentNode, key)
			}
		})
	}

	cleanup = (callback: CallableFunction): void => {
		if (callback === undefined) {
			const cleanChildren = (element) => {
				for (const child of [...element.childNodes]) {
					setTimeout(() => {
						this.#signalize.scope(child)?.cleanup();
						if (child instanceof Element && child.childNodes.length) {
							cleanChildren(child);
						}
					}, 0)
				}
			}

			for (const cleanup of this.#cleanups) {
				setTimeout(() => {
					cleanup();
				}, 0);
			}

			this.#cleanups.clear();
			cleanChildren(this.element);
			return;
		}

		this.#cleanups.add(callback);
	}

	ref = <T extends Element>(id: string): T | null => {
		return this.refs<T>(id)[0] ?? null;
	}

	refs = <T extends Element>(id: string): T[] => {
		return [...this.#signalize.selectAll<T>(
			`[${this.#signalize.config.attributesPrefix}${this.#signalize.config.refAttribute}="${id}"]`,
			this.element
		)].filter((element: Element) => {
			return element.closest(
				`[${this.#signalize.config.attributesPrefix}${this.#signalize.config.scopeAttribute}]`
			) === this.element
		})
	}
}

export default (signalize: Signalize): void => {
	const { on, config, selectAll, dispatch } = signalize;

	config.scopeAttribute = config.scopeAttribute ?? 'scope';
	config.cloakAttribute = config.cloakAttribute ?? 'cloak';
	config.refAttribute = config.refAttribute ?? 'ref';
	config.scopeKey = config.scopeKey ?? '__signalizeScope';

	const scopeAttribute = `${config.attributesPrefix}${config.scopeAttribute}`;
	const scopeKey = config.scopeKey;
	const definedScopes: Record<string, ScopeInitFunction> = signalize.config.scopes ?? {};

	const scope = (nameOrElement: string | Element | Document | DocumentFragment, init?: ScopeInitFunction): undefined | Scope => {
		if (typeof nameOrElement === 'string') {
			if (nameOrElement in definedScopes) {
				throw new Error(`Scope "${nameOrElement}" is already defined.`);
			}
			definedScopes[nameOrElement] = init;
			dispatch('scope:defined', { name: nameOrElement })
		} else if (typeof init !== 'undefined') {
			if (nameOrElement[scopeKey] === undefined) {
				nameOrElement[scopeKey] = new Scope({ signalize, element: nameOrElement })
			}

			const inited = init(nameOrElement[scopeKey]);
			if (inited instanceof Promise) {
				inited.then(() => nameOrElement[scopeKey].inited = true);
			} else {
				nameOrElement[scopeKey].inited = true;
			}
		}

		return nameOrElement[scopeKey];
	};

	on('dom:ready, scope:defined', (event) => {
		let selector = `[${scopeAttribute}]`
		if (event.detail?.name === undefined) {
			selector += `="${event.detail.name}"`
		}

		for (const element of selectAll(selector)) {
			scope(element, definedScopes[element.getAttribute(scopeAttribute)]);
		}
	});

	on('dom:mutation:node:removed', (event) => {
		scope(event.detail)?.cleanup();
	});

	on('dom:mutation:node:added' as keyof CustomEventListener, document, ({ detail }: { detail: Node }): void => {
		if (!(detail instanceof Element) || scope(detail) !== undefined) {
			return;
		}

		scope(detail, detail.getAttribute(scopeAttribute));
	});

	signalize.scope = scope;
}
