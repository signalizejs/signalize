/** @type {import('../../types/Signalize').Module<import('../../types/modules/hyperscript').HyperscriptModule>} */
export default async ({ resolve }) => {

	const { bind, Signal } = await resolve('bind', 'signal');

	/**
	 * @template T
	 * @type {import('../../types/modules/hyperscript').h}
	 */
	const h = (tagName, ...children) => {
		/** @type {import('../../types/modules/hyperscript').HyperscriptChildAttrs} */
		let attrs = {};

		if (children[0]?.constructor?.name === 'Object') {
			attrs = children.shift();
		}

		children = children.flat(Infinity);

		const el = document.createElement(tagName);

		if (Object.keys(attrs).length > 0) {
			bind(el, attrs);
		}

		/**
		 *
		 * @param {string | number | Element | Node | import('../../types/modules/signal').Signal<any>} child
		 * @returns {Array<Node | Element>}
		 */
		const normalizeChild = (child) => {
			/** @type {Array<Node | Element>} */
			const result = [];

			if (child instanceof Element || child instanceof Node) {
				result.push(child);
			} else if (child instanceof Signal) {
				result.push(...normalizeChild(child()));
				child.watch(({ newValue }) => {
					const newNormalizedChildren = normalizeChild(newValue);
					for (const newNormalizedChild of newNormalizedChildren) {
						const oldNormalizedChild = result.shift();
						if (oldNormalizedChild != null) {
							if (oldNormalizedChild !== newNormalizedChild) {
								el.replaceChild(newNormalizedChild, oldNormalizedChild);
							}
						} else {
							el.appendChild(newNormalizedChild);
						}
					}
					for (const oldNormalizedChild of result) {
						el.removeChild(oldNormalizedChild);
					}
					result.push(...newNormalizedChildren);
				});
			} else if (child instanceof Array) {
				for (const childItem of child) {
					result.push(...normalizeChild(childItem));
				}
			} else {
				result.push(document.createTextNode(String(child)));
			}

			return result;
		};

		const fragment = document.createDocumentFragment();

		for (const child of children) {
			fragment.append(...normalizeChild(child));
		}

		el.appendChild(fragment);

		/** @type {T} */
		return el;
	};

	return { h };
};
