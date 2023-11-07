import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		offset: (element: Element) => Offset
	}
}

interface Offset {
	top: number
	bottom: number
	left: number
	right: number
}

export default ($: Signalize): void => {
	$.offset = (element) => {
		const rect = element.getBoundingClientRect();
		const defaultView = element.ownerDocument.defaultView;

		return {
			top: rect.top + (defaultView !== null ? defaultView.scrollY : 0),
			bottom: rect.bottom + (defaultView !== null ? defaultView.scrollY : 0),
			left: rect.left + (defaultView !== null ? defaultView.scrollX : 0),
			right: rect.right + (defaultView !== null ? defaultView.scrollX : 0)
		};
	}
}