import type Signalize from '..';

declare module '..' {
	interface Signalize {
		dispatch: (eventName: string, eventData?: any, target?: HTMLElement | Document | DocumentFragment) => boolean
	}

}

interface Options {
	target?: Document | HTMLElement | DocumentFragment
	bubbles?: boolean
	cancelable?: boolean
}

export default (signalize: Signalize): void => {
	signalize.dispatch = (eventName: string, eventData: any = undefined, options: Options = {}): boolean => {
		return (options?.target ?? document).dispatchEvent(
			new window.CustomEvent(eventName, {
				detail: eventData,
				cancelable: options?.cancelable ?? true,
				bubbles: options?.bubbles ?? true
			})
		);
	};
}
