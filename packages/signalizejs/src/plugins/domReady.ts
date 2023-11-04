import type Signalize from '..';
import type { CustomEventListener } from './on';

declare module '..' {
	interface Signalize {
		isDomReady: () => boolean
	}

	interface CustomEventListeners {
		'dom:ready': CustomEventListener
	}
}

export default (signalize: Signalize): void => {
	const { config } = signalize
	const domReadyListeners: CallableFunction[] = [];

	const callOnDomReadyListeners = (): void => {
		while (domReadyListeners.length > 0) {
			domReadyListeners.shift()();
		}
	}

	const isDomReady = (): boolean => {
		const documentElement = config.root instanceof Document ? config.root : config.root?.ownerDocument;
		return documentElement.readyState !== 'loading'
	};
	signalize.isDomReady = isDomReady;

	if (isDomReady()) {
		callOnDomReadyListeners()
	} else {
		document.addEventListener('DOMContentLoaded', callOnDomReadyListeners, { once: true })
	}

	signalize.isDomReady = isDomReady;
	signalize.configure({
		customEventListeners: {
			'dom:ready': (target: HTMLElement | string, listener: CallableFunction, options: AddEventListenerOptions) => {
				if (isDomReady()) {
					listener()
				} else {
					domReadyListeners.push(listener);
				}
			}
		}
	})
}
