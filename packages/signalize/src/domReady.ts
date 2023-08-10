import { off } from "./off";
import { task } from "./task";

let domReadyListeners: CallableFunction[] = [];

const callOnDomReadyListeners = (): void => {
	task(domReadyListeners);
	domReadyListeners = [];
}

const windowIsDefined = typeof window !== 'undefined';
const documentIsDefined = typeof document !== 'undefined';
export const isDomReady = (): boolean => documentIsDefined && document.readyState !== 'loading';

export const onDomReady = (callback: CallableFunction): void => {
	if (isDomReady()) {
		callback()
	} else {
		domReadyListeners.push(callback);
	}
}

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
