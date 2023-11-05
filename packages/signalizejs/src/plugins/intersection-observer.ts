import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		observeIntersection: (root: Element, callback: () => void, options?: IntersectionObserverInit) => IntersectionObserver
	}
}

export default ($: Signalize): void => {
	$.observeIntersection = (element, callback, options) => {
		const observer = new IntersectionObserver(callback, {
			root: element.closest(`[${$.config.attributePrefix}intersection-observer-root]`),
			rootMargin: '0% 0%',
			threshold: [0.0, 0.1],
			...options ?? {}
		});

		observer.observe(element);
		return observer;
	}
}
