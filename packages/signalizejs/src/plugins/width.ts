import type { Signalize, SignalizePlugin } from '..';

declare module '..' {
	interface Signalize {
		width: (element: Node) => number
	}
}

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.width = (element) => {
			if (element === document) {
				return window.innerWidth;
			}

			return element instanceof Element ? parseFloat(window.getComputedStyle(element).width) : 0;
		}
	}
}
