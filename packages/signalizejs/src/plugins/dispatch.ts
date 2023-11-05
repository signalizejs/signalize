import type Signalize from '..';

declare module '..' {
	interface Signalize {
		dispatch: (eventName: string, eventData?: any, options?: Options) => boolean
	}
}

interface Options {
	target?: Document | HTMLElement | DocumentFragment
	bubbles?: boolean
	cancelable?: boolean
}

export default ($: Signalize): void => {
	$.dispatch = (eventName: string, eventData?, options?): boolean => {
		return (options?.target ?? $.config.root).dispatchEvent(
			new window.CustomEvent(eventName, {
				detail: eventData,
				cancelable: options?.cancelable ?? true,
				bubbles: options?.bubbles ?? true
			})
		);
	};
}
