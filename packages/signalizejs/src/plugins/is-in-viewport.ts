import type { Signalize } from '..'

declare module '..' {
	interface Signalize {
		isInViewport: (element: HTMLElement, options: IsInViewportOptions) => IsInViewportInfo
	}
}

interface IsInViewportOptions {
	offset: number
}

interface IsInViewportInfo {
	top: boolean
	bottom: boolean
	whole: boolean
}

export default ($: Signalize): void => {
	const { offset, height } = $;

	$.isInViewport = (element, options): IsInViewportInfo => {
		const windowTop = window.scrollY;
		const windowBottom = windowTop + window.innerHeight;
		const elementTop = offset(element).top + (options?.offset ?? 0)
		const elementBottom = elementTop + height(element);

		return {
			top: windowTop < elementTop && elementTop < windowBottom,
			bottom: windowTop < elementBottom && elementBottom < windowBottom,
			whole: windowBottom >= elementBottom && windowTop <= elementTop
		}
	}
}
