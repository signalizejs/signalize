import type Signalize from '..';

declare module '..' {
	interface Signalize {
		off: (type: string, element: HTMLElement | Document, listener: EventListenerOrEventListenerObject, options?: Record<string, any>) => void
	}
}

export default ($: Signalize): void => {
	const { selectorToIterable } = $

	$.off = (type: string, element, listener: EventListenerOrEventListenerObject, options = {}): void => {
		const events = type.split(',');
		const elements = selectorToIterable(element);

		for (const event of events) {
			for (const element of elements) {
				element.removeEventListener(event, listener, options);
			}
		}
	}
}
