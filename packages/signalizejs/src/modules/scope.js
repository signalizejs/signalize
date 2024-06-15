/** @type {import('../../types/Signalize').Module<import('../../types/index').ScopeModule>} */
export default async ($) => {
	const { params, resolve } = $;

	/**
	 * @type {{
	 *  observeMutations: import('../../types/index').observeMutations
	 * }}
	 */
	const { observeMutations } = await resolve('mutation-observer');
	const scopeKey = '__signalizeScope';
	const refAttribute = `${params.attributePrefix}ref`;

	/** @type {import('../../types/index').Scope} */
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
		 * @type {import('../../types/Signalize').Signalize}
		 */
		$ = $;

		/**
		 * @readonly
		 * @type {import('../../types/modules/scope').SignalizeNode}
		 */
		$el;

		/**
		 * @type {Scope|undefined}
		 */
		$parentScope

		/**
		 * @constructor
		 * @param {Object} options - The options object for initializing the instance.
		 * @param {import('../../types/modules/scope').SignalizeNode} options.node - The Node associated with the instance.
		 */
		constructor ({ node }) {
			this.$el = node;
			node[scopeKey] = this;
		}

		/** @type {import('../../types/index').$data} */
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
					this[key] = val;
					return true;
				},
				/**
				 * @param {Record<string, any>} target
				 * @param {string} key
				 */
				deleteProperty: (target, key) => {
					delete target[key];
					delete this[key];
					return true;
				}
			});
		}

		/** @type {import('../../types/index').$data} */
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

		/** @type {import('../../types/index').$cleanup} */
		$cleanup = (callback) => {
			if (callback !== undefined) {
				this.#cleanups.add(callback);
				return;
			}

			/**
			 * @param {import('../../types/modules/scope').SignalizeNode} element
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

		/** @type {import('../../types/index').$refs} */
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

	/** @type {import('../../types/modules/scope').scope} */
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
