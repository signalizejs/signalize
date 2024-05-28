/* declare module '..' {
	interface Signalize {
		isDomReady: () => boolean
	}

	interface CustomEventListeners {
		'dom:ready': CustomEventListener
	}
} */

/**
 * @param {import('../Signalize').Signalize} $
 */
export default async ({ resolve, root }) => {
	const { customEventListener } = await resolve('event', { waitOnInit: false });

	/** @type {CallableFunction[]} */
	const domReadyListeners = [];

	const callOnDomReadyListeners = () => {
		while (domReadyListeners.length > 0) {
			domReadyListeners.shift();
		}
	};

	/**
	 * @returns {boolean}
	 */
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
