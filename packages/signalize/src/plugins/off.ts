import type Signalize from '..';

declare module '..' {
	interface Signalize {
		off: (type: string, element, listener: EventListenerOrEventListenerObject, options?: Record<string, any>) => void
	}
}

export default (signalize: Signalize): void => {
	signalize.off = (type: string, element, listener: EventListenerOrEventListenerObject, options = {}): void => {
		const events = type.split(',');
		const elements = signalize.normalizeTargets(element);

		for (const event of events) {
			for (const element of elements) {
				element.removeEventListener(event, listener, options);
			}
		}
	}
}