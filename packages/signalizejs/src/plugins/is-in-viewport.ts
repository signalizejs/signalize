import type { Signalize, SignalizePlugin } from '..'

declare module '..' {
	interface Signalize {
		isInViewport: (element: Element) => IsInViewportInfo
	}
}

interface IsInViewportInfo {
	top: boolean
	bottom: boolean
	whole: boolean
}

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.isInViewport = (element) => {
			const windowTop = window.scrollY;
			const windowBottom = windowTop + window.innerHeight;
			const elementTop = $.offset(element).top;
			const elementBottom = elementTop + $.height(element);

			return {
				top: windowTop < elementTop && elementTop < windowBottom,
				bottom: windowTop < elementBottom && elementBottom < windowBottom,
				whole: windowBottom >= elementBottom && windowTop <= elementTop
			}
		}
	}
}
