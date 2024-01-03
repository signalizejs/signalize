/* declare module '..' {
	interface Signalize {
		isInViewport: (element: Element) => IsInViewportInfo
	}
} */

/**
 * Information about the visibility of an element within the viewport.
 *
 * @interface IsInViewportInfo
 * @property {boolean} top - Indicates if the top of the element is visible in the viewport.
 * @property {boolean} bottom - Indicates if the bottom of the element is visible in the viewport.
 * @property {boolean} whole - Indicates if the entire element is visible in the viewport.
 */

/**
 * @returns {import('../Signalize').SignalizePlugin}
 */
export default () => {
	/**
	 * @param {import('../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
		/**
		 * @param {Element} element - The element to check
		 * @returns {IsInViewportInfo}
		 */
		$.isInViewport = (element) => {
			const windowTop = window.scrollY;
			const windowBottom = windowTop + window.innerHeight;
			const elementTop = $.offset(element).top;
			const elementBottom = elementTop + $.height(element);

			return {
				top: windowTop < elementTop && elementTop < windowBottom,
				bottom: windowTop < elementBottom && elementBottom < windowBottom,
				whole: windowBottom >= elementBottom && windowTop <= elementTop
			};
		};
	};
};
