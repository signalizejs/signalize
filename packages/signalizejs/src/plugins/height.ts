import type Signalize from '..';

declare module '..' {
	interface Signalize {
		height: (element: Node) => number
	}
}

export default (signalize: Signalize): void => {
	signalize.height = (element) => {
		if (element === document) {
			return window.innerHeight;
		}

		return element instanceof Element ? parseFloat(window.getComputedStyle(element).height) : 0;
	}
}
