/* declare module '..' {
	interface Signalize {
		offset: (element: Element) => Offset
	}
} */

/**
 * Represents an offset object with top, bottom, left, and right properties.
 *
 * @interface Offset
 * @property {number} top - The top offset value.
 * @property {number} bottom - The bottom offset value.
 * @property {number} left - The left offset value.
 * @property {number} right - The right offset value.
 */

export default () => {
	/**
	 * @param {import('../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
		/**
		 * @param {Element} element
		 * @returns {Offset}
		 */
		$.offset = (element) => {
			const rect = element.getBoundingClientRect();
			const defaultView = element.ownerDocument.defaultView;

			return {
				top: rect.top + (defaultView !== null ? defaultView.scrollY : 0),
				bottom: rect.bottom + (defaultView !== null ? defaultView.scrollY : 0),
				left: rect.left + (defaultView !== null ? defaultView.scrollX : 0),
				right: rect.right + (defaultView !== null ? defaultView.scrollX : 0)
			};
		};
	};
};
