/**
 * @callback observeIntersection
 * @param {Element} element
 * @param {IntersectionObserverCallback} callback
 * @param {IntersectionObserverInit} options
 * @returns {IntersectionObserver}
 */

/** @type {import('../Signalize').SignalizeModule} */
export default ({ params }) => ({
	/** @type {observeIntersection} */
	observeIntersection: (element, callback, options) => {
		const observer = new IntersectionObserver(callback, {
			root: element.closest(`[${params.attributePrefix}intersection-observer-root]`),
			rootMargin: '0% 0%',
			threshold: [0.0, 0.1],
			...options ?? {}
		});

		observer.observe(element);
		return observer;
	}
});
