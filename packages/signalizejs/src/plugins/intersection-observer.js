/* declare module '..' {
	interface Signalize {
		observeIntersection: (root: Element, callback: () => void, options?: IntersectionObserverInit) => IntersectionObserver
	}
} */

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
		 * @param {Element} element
		 * @param {CallableFunction} callback
		 * @param {IntersectionObserverInit} options
		 * @returns {IntersectionObserver}
		 */
		$.observeIntersection = (element, callback, options) => {
			const observer = new IntersectionObserver(callback, {
				root: element.closest(`[${$.attributePrefix}intersection-observer-root]`),
				rootMargin: '0% 0%',
				threshold: [0.0, 0.1],
				...options ?? {}
			});

			observer.observe(element);
			return observer;
		};
	};
};
