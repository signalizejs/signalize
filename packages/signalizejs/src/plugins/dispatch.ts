import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		customEvent: (eventName: string, eventData?: any, options?: Options) => CustomEvent
		dispatch: (eventName: string, eventData?: any, options?: Options) => boolean
	}
}

interface Options {
	target?: Document | Element | DocumentFragment
	bubbles?: boolean
	cancelable?: boolean
}

export default ($: Signalize): void => {
	$.customEvent = (eventName, eventData?, options?) => new window.CustomEvent(eventName, {
		detail: eventData,
		cancelable: options?.cancelable ?? false,
		bubbles: options?.bubbles ?? false
	});

	$.dispatch = (eventName, eventData?, options?) => (options?.target ?? $.root).dispatchEvent(
		$.customEvent(eventName, eventData, options)
	);
}
