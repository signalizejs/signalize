/**
 * Interface representing the scope with essential properties and methods.
 *
 * @typedef
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

/** @type {import('../Signalize').SignalizeModule} */
export default async ($) => {
	const { params, resolve } = $;
	const { observeMutations } = await resolve('mutation-observer');
	const scopeKey = '__signalizeScope';
	const refAttribute = `${params.attributePrefix}ref`;

	class Scope {
		/**
		 * @readonly
		 * @type {Set<CallableFunction>}
		 */
		#cleanups = new Set();

		/**
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
		 * @type {Scope|null}
		 */
		$parentScope = null;

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
				/**
				 * @param {Record<string, any>} target
				 * @param {string} key
				 */
				get: (target, key) => {
					return target[key] ?? this.$parentScope?.$data[key];
				},
				/**
				 * @param {Record<string, any>} target
				 * @param {string} key
				 * @param {any} val
				 */
				set: (target, key, val) => {
					target[key] = val;
					return true;
				},
				/**
				 * @param {Record<string, any>} target
				 * @param {string} key
				 */
				deleteProperty: (target, key) => {
					delete target[key];
					return true;
				}
			});
		}

		set $data (data) {
			this.#data = data;
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
		 * @returns {Element[]}
		 */
		$refs = new Proxy({}, {
			get: (target, key) => {
				const refs = [...this.$el.querySelectorAll(`[${refAttribute}=${key}]`)].filter((element) => {
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

				if (refs.length === 0) {
					return null;
				}

				return refs.length === 1 ? refs[0] : refs;
			}
		});
	}

	/**
	 * @param {Node} node
	 * @param {ScopeInitFunction} [init]
	 * @returns {Scope|undefined}
	 */
	const scope = (node, init) => {
		if (typeof init === 'function') {
			init(node[scopeKey] ?? new Scope({ node }));
		}

		return node[scopeKey] ?? undefined;
	};

	observeMutations(({ removedNodes }) => {
		for (const removedNode of removedNodes) {
			scope(removedNode)?.$cleanup();
		}
	});

	return { scope };
};
