/* declare module '..' {
	interface Signalize {
		selectorToIterable: (target: Selectable, normalizeDocument?: boolean) => IterableElements
		select: <T extends Element>(selector: string, root?: string | Element) => T | null
		selectAll: <T extends Element>(selector: string, root?: string | Element) => NodeListOf<T>
	}
} */

/**
 * Represents a type that can be selected, which may be a string, a NodeList of elements,
 * an array of elements, a single element, a Window, or a Document.
 *
 * @typedef {string | NodeListOf<Element> | Element[] | Element | Window | Document} Selectable
 */

/**
 * Represents a type for an array containing elements, where each element
 * can be an Element, Document, or Window.
 *
 * @typedef {Array<Element | Document | Window>} IterableElements
 */

/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default ($) => {
	/**
	 * Selects an element matching the given selector within a specified root.
	 *
	 * @function
	 * @template T
	 * @param {string} selector - The CSS selector to match elements.
	 * @param {string | Element | Document} [root=$.root] - The root element or document to search within.
	 * @returns {T | null} The selected element or null if not found.
	 */
	$.select = (selector, root = $.root) => {
		const rootEl = typeof root === 'string' ? $.root.querySelector(root) : root;

		if (rootEl === null) {
			throw new Error('Signalize: root for select cannot be null.');
		}

		return rootEl.querySelector(selector);
	};

	/**
	 * Selects all elements matching the given selector within a specified root.
	 *
	 * @function
	 * @template T
	 * @param {string} selector - The CSS selector to match elements.
	 * @param {string | Element | Document} [root=$.root] - The root element or document to search within.
	 * @returns {NodeListOf<T>} A NodeList containing all selected elements.
	 */
	$.selectAll = (selector, root = $.root) => {
		const rootEl = typeof root === 'string' ? $.root.querySelector(root) : root;

		if (rootEl === null) {
			throw new Error('Signalize: root for selectAll cannot be null.');
		}

		return rootEl.querySelectorAll(selector);
	};

	/**
	 *
	 * @param {Selectable} target
	 * @param {boolean} normalizeDocument
	 * @returns {IterableElements}
	 */
	$.selectorToIterable = (target, normalizeDocument = false) => {
		/** @type {IterableElements} */
		let elements;

		if (typeof target === 'string') {
			elements = [...$.selectAll<Element>(target)];
		} else {
			const targetIsDocument = target instanceof Document;
			if (target instanceof Element || targetIsDocument || target instanceof Window) {
				elements = [targetIsDocument && normalizeDocument ? target.documentElement : target];
			} else {
				elements = target instanceof Array || target instanceof NodeList ? [...target] : [target];
			}
		}

		return elements.filter((element) => element !== null);
	};
};
