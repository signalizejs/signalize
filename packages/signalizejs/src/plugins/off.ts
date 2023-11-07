import type Signalize from '..';

declare module '..' {
	interface Signalize {
		off: (type: string, element: Element | Document, listener: EventListenerOrEventListenerObject, options?: Record<string, any>) => void
	}
}

export default ($: Signalize): void => {
	$.off = (type, element, listener, options = {}) => {
		const events = type.split(',');
		const elements = $.selectorToIterable(element);

		for (const event of events) {
			for (const element of elements) {
				element.removeEventListener(event, listener, options);
			}
		}
	}
}
