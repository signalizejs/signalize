import type Signalize from '..';

declare module '..' {
	interface Signalize {
		width: (element: Node) => number
	}
}

export default (signalize: Signalize): void => {
	signalize.height = (element) => {
		if (element === document) {
			return window.innerWidth;
		}

		return element instanceof Element ? parseFloat(window.getComputedStyle(element).width) : 0;
	}
}
