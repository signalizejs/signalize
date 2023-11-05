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
}

type ScopeInitFunction = (Scope: Scope) => void | Promise<void>;

export class Scope {
	readonly #$: Signalize;
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
		this.element = element;
		this.#$ = signalize;
		this.element[signalize.config.scopeKey] = this;
	}

	set data (newValue) {
		this.#localData = newValue;
	}

	get data() {
		const { scope, merge } = this.#$;
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

			return element[this.#$.config.scopeKey] === undefined ? getParentData(element.parentNode, key) : scope(element).data[key];
		}

		const setParentData = (element, key: string, value: any) => {
			if (element === null) {
				return false;
			}

			if (element[this.#$.config.scopeKey] !== undefined) {
				this.#$.scope(element).data[key] = value;
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
						this.#$.scope(child)?.cleanup();
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
		return [...this.#$.selectAll<T>(
			`[${this.#$.config.attributePrefix}ref="${id}"]`,
			this.element
		)].filter((element: Element) => {
			return element.closest(
				`[${this.#$.config.attributePrefix}scope]`
			) === this.element
		})
	}
}

export default ($: Signalize): void => {
	const { on, selectAll, dispatch } = $;

	$.config.cloakAttribute = 'cloak';

	let scopeAttribute: string;
	const scopeKey = '__signalizeScope';
	const definedScopes: Record<string, ScopeInitFunction> = {};

	const scope = (nameOrElement: string | Element | Document | DocumentFragment, init?: ScopeInitFunction): undefined | Scope => {
		if (typeof nameOrElement === 'string') {
			if (nameOrElement in definedScopes) {
				throw new Error(`Scope "${nameOrElement}" is already defined.`);
			}
			definedScopes[nameOrElement] = init;
			dispatch('scope:defined', { name: nameOrElement })
		} else if (typeof init !== 'undefined') {
			if (nameOrElement[scopeKey] === undefined) {
				nameOrElement[scopeKey] = new Scope({ signalize: $, element: nameOrElement })
			}

			init(nameOrElement[scopeKey]);
		}

		return nameOrElement[scopeKey];
	};

	on('signalize:ready', () => {
		scopeAttribute = `${$.config.attributePrefix}scope`;

		on('dom:ready scope:defined', (event) => {
			let selector = `[${scopeAttribute}]`
			if (event !== undefined && event.detail?.name === undefined) {
				selector += `="${event.detail.name}"`
			}

			for (const element of selectAll(selector)) {
				scope(element, definedScopes[element.getAttribute(scopeAttribute)]);
			}
		});

		on('dom:mutation:node:removed', (event) => {
			scope(event.detail)?.cleanup();
		});

		on('dom:mutation:node:added' as keyof CustomEventListener, $.config.root, ({ detail }: { detail: Node }): void => {
			if (!(detail instanceof Element) || scope(detail) !== undefined) {
				return;
			}

			scope(detail, detail.getAttribute(scopeAttribute));
		});
	})

	$.scope = scope;
}
