import type Signalize from '..';

export default (signalize: Signalize): void => {
	const { off } = signalize;
	let domReadyListeners: CallableFunction[] = [];

	const callOnDomReadyListeners = (): void => {
		while (domReadyListeners.length > 0) {
			domReadyListeners.shift()();
		}
	}

	const windowIsDefined = typeof window !== 'undefined';
	const documentIsDefined = typeof document !== 'undefined';
	const isDomReady = (): boolean => documentIsDefined && document.readyState !== 'loading';
	signalize.isDomReady = isDomReady;

	const onDomReady = (callback: CallableFunction): void => {
		if (isDomReady()) {
			callback()
		} else {
			domReadyListeners.push(callback);
		}
	}

	signalize.onDomReady = onDomReady;

	if (windowIsDefined && documentIsDefined) {
		if (isDomReady()) {
			callOnDomReadyListeners()
		} else {
			const domContentLoadedListener = (): void => {
				off('DOMContentLoaded', document, domContentLoadedListener);
				callOnDomReadyListeners();
			}

			document.addEventListener('DOMContentLoaded', domContentLoadedListener)
		}
	}
}
