/**
 * Represents a child element in hyperscript, which can be a string, number, Element, Node, or Signal.
 *
 * @typedef {(string | number | Element | Node | import('./signal').Signal<any>)} HyperscriptChild
 */

/**
 * Represents attributes for a hyperscript child element, where each attribute is a key-value pair
 * with the key being a string and the value being either a string or a Signal.
 *
 * @typedef {Object.<string, string | import('./signal').Signal>} HyperscriptChildAttrs
 */

/**
 * Creates a new HTML element using hyperscript syntax.
 *
 * @function
 * @template {HTMLElement} T
 * @param {string} tagName - The tag name of the HTML element to create.
 * @param {...(HyperscriptChildAttrs | HyperscriptChild | HyperscriptChild[])} children - Child elements or attributes.
 * @returns {T} - The newly created HTML element.
*/

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve }) => {
	const { bind, Signal } = await resolve('bind', 'signal');

	/** @type {h}  */
	const h = (tagName, ...children) => {
		/** @type {HyperscriptChildAttrs} */
		let attrs = {};

		if (children[0]?.constructor?.name === 'Object') {
			/** @type {HyperscriptChildAttrs} */
			attrs = children.shift();
		}

		children = children.flat(Infinity);

		const el = document.createElement(tagName);

		if (Object.keys(attrs).length > 0) {
			bind(el, attrs);
		}

		/**
		 *
		 * @param {string | number | Element | Node | import('./signal').Signal<any>} child
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
