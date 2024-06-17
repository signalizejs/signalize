/** @type {import('../../types/Signalize').Module<import('../../types/modules/intersection-observer').IntersectionObserverModule>} */
export default ({ params }) => ({
	/** @type {import('../../types/modules/intersection-observer').observeIntersection} */
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
