let onDomReadyListeners: CallableFunction[] = [];

const callOnDomReadyListeners = (): void => {
	for (const onDomReadyListener of onDomReadyListeners) {
		onDomReadyListener();
	}

	onDomReadyListeners = [];
}

const windowIsDefined = typeof window !== 'undefined';
const documentIsDefined = typeof document !== 'undefined';
const documentIsReady = documentIsDefined && document.readyState !== 'loading';

export const onDomReady = (callback: CallableFunction): void => {
	if (!windowIsDefined) {
		return;
	}

	if (documentIsDefined) {
		callback()
	} else {
		onDomReadyListeners.push(callback);
	}
}

if (windowIsDefined && documentIsDefined) {
	if (documentIsReady) {
		callOnDomReadyListeners()
	} else {
		document.addEventListener('DOMContentLoaded', () => { callOnDomReadyListeners(); })
	}
}
