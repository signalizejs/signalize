/* declare module '..' {
	interface Signalize {
		scope: (node: Node, init?: ScopeInitFunction) => ScopeInterface
	}
}
 */

/**
 * Interface representing the scope with essential properties and methods.
 *
 * @interface
 * @property {Element} $el - The root element associated with the scope.
 * @property {(callback?: CallableFunction) => void} $cleanup - Performs cleanup operations, optionally executing a callback.
 */

/**
 * Type representing a function that initializes a scope.
 *
 * @typedef {function} ScopeInitFunction
 * @param {ScopeInterface} scope - The scope object to be initialized.
 * @returns {void}
 */

/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default ($) => {
	const scopeKey = '__signalizeScope';
	const refAttribute = `${$.attributePrefix}ref`;

	class Scope {
		/**
		 * @readonly
		 * @type {Set<CallableFunction>}
		 */
		#cleanups = new Set();

		/**
		 * @readonly
		 * @type {Record<string, any>}
		 */
		#data = {};

		/**
		 * @readonly
		 * @type {import('../Signalize').Signalize}
		 */
		$ = $;

		/**
		 * @readonly
		 * @type {HTMLElement}
		 */
		$el;

		/**
		 * @constructor
		 * @param {Object} options - The options object for initializing the instance.
		 * @param {Node} options.node - The Node associated with the instance.
		 */
		constructor ({ node }) {
			this.$el = node;
			node[scopeKey] = this;
		}

		get $data() {
			return new Proxy(this.#data, {
				get: (target, key) => target[key],
				set: (target, key, val) => {
					target[key] = val;
					this[key] = val;
					return true;
				},
				deleteProperty: (target, key) => {
					delete target[key];
					delete this[key];
					return true;
				}
			});
		}

		set $data (data) {
			for (const key in this.$data) {
				if (key in data) {
					continue;
				}

				delete this.$data[key];
			}

			for (const key in data) {
				this.$data[key] = data[key];
			}
		}

		/**
		 * @param {CallableFunction} [callback]
		 * @returns {void}
		 */
		$cleanup = (callback) => {
			if (callback !== undefined) {
				this.#cleanups.add(callback);
				return;
			}

			/**
			 * @param {Element} element
			 * @returns {void}
			 */
			const cleanChildren = (element) => {
				for (const child of [...element.childNodes]) {
					scope(child)?.$cleanup();

					if (child instanceof Element && child.childNodes.length > 0) {
						cleanChildren(child);
					}
				}
			};

			for (const cleanup of this.#cleanups) {
				cleanup();
			}

			this.#cleanups.clear();

			cleanChildren(this.$el);
		};

		/**
		 * @param {string} name
		 * @returns {Element|null}
		 */
		$ref = (name) => {
			return this.$refs(name)[0] ?? null;
		};

		/**
		 * @param {string} name
		 * @returns {Element[]}
		 */
		$refs = (name) => {
			return [...this.$el.querySelectorAll(`[${refAttribute}=${name}]`)].filter((element) => {
				const checkParentElement = (el) => {
					const parentElement = el.parentNode;
					if (parentElement === this.$el) {
						return true;
					}

					if (parentElement.tagName.toLowerCase().includes('-')) {
						return false;
					}

					return checkParentElement(parentElement);
				};
				
				return checkParentElement(element);
			});
		};
	}

	/**
	 * @param {Node} node
	 * @param {ScopeInitFunction} init
	 * @returns {Scope|undefined}
	 */
	const scope = (node, init) => {
		if (typeof init === 'function') {
			init(node[scopeKey] ?? new Scope({ node }));
		}

		return node[scopeKey] ?? undefined;
	};

	$.on('dom:mutation:node:removed', (event) => {
		scope(event.detail)?.$cleanup();
	});

	$.scope = scope;
};
