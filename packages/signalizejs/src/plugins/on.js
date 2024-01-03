/* declare module '..' {
	interface Signalize {
		on: (
			event: keyof CustomEventListeners,
			targetOrCallback: EventTarget | CallableFunction,
			callbackOrOptions?: CallableFunction | AddEventListenerOptions,
			options?: AddEventListenerOptions
		) => void
		off: (type: string, element: Element | Document, listener: EventListenerOrEventListenerObject, options?: Record<string, any>) => void
		customEventListener: (name: string, listener: CustomEventListener) => void
	}

	interface CustomEventListeners extends HTMLElementEventMap {
		remove: CustomEventListener
		clickOutside: CustomEventListener
	}
}
 */

/**
 * Represents a type that can be used as an event target, which may be a string,
 * a NodeList of elements, an array of elements, a single element, or a Window.
 *
 * @typedef {string | NodeListOf<Element> | Element[] | Element | Window} EventTarget
 */

/**
 * Represents a custom event listener with on and optional off methods.
 *
 * @typedef {Object} CustomEventListener
 * @property {(args: CustomEventListenerArgs) => void} on - Method to add an event listener.
 * @property {(args: CustomEventListenerArgs) => void} [off] - Optional method to remove an event listener.
 */

/**
 * Represents the arguments for a custom event listener, including the target element,
 * listener function, options, and the event name.
 *
 * @typedef {Object} CustomEventListenerArgs
 * @property {Element} target - The target element for the event listener.
 * @property {CallableFunction} listener - The listener function to be added or removed.
 * @property {AddEventListenerOptions} options - Options for adding the event listener.
 * @property {string} event - The name of the event.
 */

/**
 * Represents a set of custom event listeners associated with specific events.
 *
 * @interface CustomEventListeners
 * @extends ElementEventMap
 * @property {CustomEventListener} clickOutside - Custom event listener for the 'clickOutside' event.
 * @property {CustomEventListener} remove - Custom event listener for the 'remove' event.
 */

/**
 * Represents options for configuring a plugin, including custom event listeners.
 *
 * @interface PluginOptions
 * @property {Record<string, CustomEventListener>} customEventListeners - Custom event listeners for the plugin.
 */

/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default ($) => {
	/** @type {Record<string,CustomEventListener>} */
	const customEventListeners = {
		clickOutside: {
			on: ({ target, listener, options }) => {
				document.addEventListener('click', (listenerEvent) => {
					/** @type {Element} */
					const eventTarget = listenerEvent.target;

					if ((typeof target === 'string' && (eventTarget.matches(target) || eventTarget.closest(target) !== null)) ||
						(target instanceof Element && target === eventTarget)
					) {
						return;
					}

					const targetIsString = typeof target === 'string';
					if (eventTarget !== target && (!targetIsString || (targetIsString && (!eventTarget.matches(target) || eventTarget.closest(target) === null)))) {
						listener(listenerEvent);
					}
				}, options);
			},
			off: ({ listener }) => {
				document.removeEventListener('click', listener);
			}
		},
		remove: {
			on: ({ target, listener }) => {
				const callback = (event) => {
					if (event.detail === target) {
						listener();
						$.off('dom:mutation:node:removed', $.root, callback);
					}
				};

				on('dom:mutation:node:removed', callback, { passive: true });
			}
		}
	};

	/**
	 * Adds an event listener to the specified target or invokes a callback for the given events.
	 *
	 * @function
	 * @param {keyof CustomEventListeners} events - The name of the event or events to listen for.
	 * @param {EventTarget | CallableFunction} targetOrCallback - The target element, or a callback function if no target is specified.
	 * @param {CallableFunction | AddEventListenerOptions} [callbackOrOptions] - The callback function or options for the event listener.
	 * @param {AddEventListenerOptions} [options] - Options for the event listener.
	 * @returns {void}
	 */
	const on = (events, targetOrCallback, callbackOrOptions, options) => {
		/** @type {import('./select').Selectable} */
		let target;
		/** @type {CallableFunction} */
		let listener;
		options = typeof callbackOrOptions === 'function' ? options : callbackOrOptions;

		if (typeof targetOrCallback === 'function') {
			target = $.root;
			listener = targetOrCallback;
		} else {
			target = targetOrCallback;
			/** @type {CallableFunction} */
			listener = callbackOrOptions;
		}

		const listenerType = typeof target === 'string' ? 'global' : 'direct';
		/** @type {Record<string, CustomEventListener>} */
		const handlers = {
			global: ({ target, listener, options }) => {
				document.addEventListener(events, (listenerEvent) => {
					/** @type {Element} */
					const eventTarget = listenerEvent.target;

					if (eventTarget.matches(target) || (eventTarget.closest(target) != null)) {
						listener(listenerEvent);
					}
				}, options);
			},
			direct: ({ target, listener, options }) => {
				for (const element of $.selectorToIterable(target)) {
					element.addEventListener(events, listener, options);
				}
			}
		};

		for (const event of events.split(' ').map((event) => event.trim())) {
			/** @type {CustomEventListenerArgs} */
			const listenerData = { event, target, listener, options };

			if (event in customEventListeners) {
				if (options?.once === true) {
					listenerData.listener = (...args) => {
						listener.apply(undefined, args);
						customEventListeners[event]?.off(listenerData);
					};
				}
				customEventListeners[event].on(listenerData);
				continue;
			}

			handlers[listenerType](listenerData);
		}
	};

	$.customEventListener = (name, config) => {
		customEventListeners[name] = config;
	};

	$.off = (events, element, listener, options = {}) => {
		const elements = $.selectorToIterable(element);

		for (const event of events.split(' ')) {
			if (event in customEventListeners) {
				customEventListeners[event]?.off({ event, target: element, listener, options });
				continue;
			}

			for (const element of elements) {
				element.removeEventListener(event, listener, options);
			}
		}
	};

	$.on = on;
};
