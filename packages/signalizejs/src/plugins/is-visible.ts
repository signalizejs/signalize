import type { Signalize } from '..'

declare module '..' {
	interface Signalize {
		isVisible: (element: Element) => boolean
	}
}

export default ($: Signalize): void => {
	$.isVisible = (element: Element): boolean => {
		if (element.getClientRects().length !== 0) {
			return true;
		}

		return element.offsetWidth !== 0 || element.offsetHeight !== 0;
	}
}
