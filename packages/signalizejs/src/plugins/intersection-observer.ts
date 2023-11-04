import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		observeIntersection: (root: Element, callback: () => void, options?: IntersectionObserverInit) => IntersectionObserver
	}

	interface SignalizeConfig {
		intersectionObserverRootAttribute: string
	}
}

export default (signalize: Signalize): void => {
	const { config } = signalize;
	config.intersectionObserverRootAttribute = `${config.attributesPrefix}${config.intersectionObserverRootAttribute ?? 'intersection-observer-root'}`;

	signalize.observeIntersection = (element, callback, options) => {
		const observer = new IntersectionObserver(callback, {
			...{
				root: element.closest(`[${config.intersectionObserverRootAttribute}]`),
				rootMargin: '0% 0%',
				threshold: [0.0, 0.1]
			},
			...options ?? {}
		});

		observer.observe(element);
		return observer;
	}
}
