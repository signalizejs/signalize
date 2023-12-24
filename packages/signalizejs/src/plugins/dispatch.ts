import type { Signalize } from '..';

declare module '..' {
	interface Signalize {
		dispatch: (eventName: string, eventData?: any, options?: Options) => boolean
	}
}

interface Options {
	target?: Document | Element | DocumentFragment
	bubbles?: boolean
	cancelable?: boolean
}

export default ($: Signalize): void => {
	$.dispatch = (eventName, eventData?, options?) => {
		return (options?.target ?? $.root).dispatchEvent(
			new window.CustomEvent(eventName, {
				detail: eventData,
				cancelable: options?.cancelable ?? false,
				bubbles: options?.bubbles ?? false
			})
		);
	};
}
