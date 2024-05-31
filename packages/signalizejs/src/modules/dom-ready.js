
/**
 * @callback isDomReady
 * @returns {boolean}
 */

/** @type {import('../Signalize').SignalizeModule} */
export default async ({ resolve, root }) => {
	const { customEventListener } = await resolve('event', { waitOnInit: false });

	/** @type {CallableFunction[]} */
	const domReadyListeners = [];

	const callOnDomReadyListeners = () => {
		while (domReadyListeners.length > 0) {
			const listener = domReadyListeners.shift();

			if (typeof listener !== 'function') {
				throw new Error('Dom ready listener must be a function.');
			}

			listener();
		}
	};

	/** @type {isDomReady} */
	const isDomReady = () => {
		const documentElement = root instanceof Document ? root : root?.ownerDocument;
		return documentElement.readyState !== 'loading';
	};

	customEventListener('dom:ready', ({
		on: ({ listener }) => {
			if (isDomReady()) {
				listener();
			} else {
				domReadyListeners.push(listener);
			}
		}
	}));

	if (isDomReady()) {
		callOnDomReadyListeners();
	} else {
		document.addEventListener('DOMContentLoaded', callOnDomReadyListeners, { once: true });
	}

	return {
		isDomReady
	};
};
