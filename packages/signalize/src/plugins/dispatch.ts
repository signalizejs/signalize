import type Signalize from '..';

declare module '..' {
	interface Signalize {
		dispatch: (eventName: string, eventData?: any, target?: HTMLElement | Document | DocumentFragment) => boolean
	}
}

export default (signalize: Signalize): void => {
	signalize.dispatch = (eventName: string, eventData: any = undefined, target = document): boolean => {
		return target.dispatchEvent(
			new window.CustomEvent(eventName, {
				detail: eventData,
				cancelable: true,
				bubbles: true
			})
		);
	};
}
