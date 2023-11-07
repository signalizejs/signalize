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

export default ($: Signalize): void => {
	const domReadyListeners: CallableFunction[] = [];

	const callOnDomReadyListeners = (): void => {
		while (domReadyListeners.length > 0) {
			$.task(domReadyListeners.shift())
		}
	}

	const isDomReady = (): boolean => {
		const documentElement = $.root instanceof Document ? $.root : $.root?.ownerDocument;
		return documentElement.readyState !== 'loading'
	};

	$.customEventListener('dom:ready', (target: Element | string, listener: CallableFunction, options: AddEventListenerOptions) => {
		if (isDomReady()) {
			listener()
		} else {
			domReadyListeners.push(listener);
		}
	});

	if (isDomReady()) {
		callOnDomReadyListeners();
	} else {
		document.addEventListener('DOMContentLoaded', callOnDomReadyListeners, { once: true })
	}

	$.isDomReady = isDomReady;
}
