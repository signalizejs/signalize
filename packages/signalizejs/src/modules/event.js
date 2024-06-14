/**
 * Represents a type that can be used as an event target, which may be a string,
 * a NodeList of elements, an array of elements, a single element, or a Window.
 *
 * @typedef {string | NodeListOf<Element> | Element[] | Element | Window} EventTarget
 */

/**
 * Represents a custom event listener.
 *
 * @typedef {Object} CustomEventListenerConfig
 * @property {CustomEventListenerOnHandler} on - Method to add an event listener.
 * @property {(args: CustomEventListenerArgs) => void} [off] - Optional method to remove an event listener.
 * @property {(args: CustomEvent) => void} [dispatch] - Optional method for dispatching global event.
 */

/**
 * @callback CustomEventListenerOnHandler
 * @param {CustomEventListenerArgs} args
 * @returns {void}
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
 * @typedef CustomEventListeners
 * @extends ElementEventMap
 * @property {CustomEventListener} clickOutside - Custom event listener for the 'clickOutside' event.
 * @property {CustomEventListener} remove - Custom event listener for the 'remove' event.
 */

/**
 * Dispatches a custom event with the specified name, data, and options.
 *
 * @callback dispatch
 * @param {string} eventName - The name of the custom event to dispatch.
 * @param {*} [eventData] - Optional data to associate with the custom event.
 * @param {Record<string, any>} [options] - Options for configuring the dispatch of the custom event.
 * @returns {boolean} Indicates whether the event dispatch was successful.
 */

/**
 * Creates a custom event with the specified name, data, and options.
 *
 * @callback customEvent
 * @param {string} eventName - The name of the custom event.
 * @param {*} [eventData] - Optional data to associate with the custom event.
 * @param {CustomEventInit} [options] - Options for configuring the custom event.
 * @returns {CustomEvent} A newly created custom event.
 */

/**
 * Creates a custom event listener.
 *
 * @callback customEventListener
 * @param {string} eventName - The name of the custom event.
 * @param {CustomEventListenerConfig|CustomEventListenerOnHandler} configOrHandler
 * @returns {void}
 */

/**
 * Represents options for configuring a plugin, including custom event listeners.
 *
 * @typedef PluginOptions
 * @property {Record<string, CustomEventListener>} customEventListeners - Custom event listeners for the plugin.
 */

/**
 * Adds an event listener to the specified target or invokes a callback for the given events.
 *
 * @callback on
 * @param {keyof CustomEventListeners} events - The name of the event or events to listen for.
 * @param {EventTarget | CallableFunction} targetOrCallback - The target element, or a callback function if no target is specified.
 * @param {CallableFunction | AddEventListenerOptions} [callbackOrOptions] - The callback function or options for the event listener.
 * @param {AddEventListenerOptions} [options] - Options for the event listener.
 * @returns {void}
 */

/** @type {import('../../types/Signalize').Module} */
export default async ({ root, resolve }) => {
	const { observeMutations } = await resolve('mutation-observer');

	/** @type {Record<string,CustomEventListenerConfig>} */
	const customEventListeners = {
		clickoutside: {
			on: ({ target, listener, options }) => {
				document.addEventListener('click', (listenerEvent) => {
					/** @type {Element} */
					const eventTarget = listenerEvent.target;

					if ((typeof target === 'string' && (eventTarget.matches(target) || eventTarget.closest(target) !== null)) ||
						(target instanceof Element && (target === eventTarget || target.contains(eventTarget)))
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
				/** @type {CallableFunction} */
				const unobserve = observeMutations(({ removedNodes }) => {
					if (removedNodes.includes(target)) {
						listener();
						unobserve();
					}
				});
			}
		}
	};

	/**
	 * @param {Selectable} target
	 * @param {boolean} container
	 * @returns {IterableElements}
	 */
	const selectorToIterable = (target, container) => {
		/** @type {IterableElements} */
		let elements = [];

		if (typeof target === 'string') {
			for (const selector of target.split(',')) {
				elements = [
					...elements,
					...(container ?? root).querySelectorAll(selector)
				];
			}
		} else {
			const targetIsDocument = target instanceof Document;
			if (target instanceof Element || targetIsDocument || target instanceof Window) {
				elements = [target];
			} else {
				elements = target instanceof Array || target instanceof NodeList ? [...target] : [target];
			}
		}

		return elements.filter((element) => element !== null);
	};

	/**
	 * @type {on}
	 */
	const on = (events, targetOrCallback, callbackOrOptions, options) => {
		/** @type {import('./select').Selectable} */
		let targetOrSelector;
		/** @type {CallableFunction} */
		let listener;
		options = typeof callbackOrOptions === 'function' ? options : callbackOrOptions;

		if (typeof targetOrCallback === 'function') {
			targetOrSelector = root;
			listener = targetOrCallback;
		} else {
			targetOrSelector = targetOrCallback;
			listener = callbackOrOptions;
		}

		const attachListeners =  (target) => {
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

				target.removeEventListener(event, listener);
				target.addEventListener(event, listener, options);
			}
		};

		const offCallback = () => {
			return off(events, targetOrSelector, listener, options)
		};

		if (typeof targetOrSelector !== 'string') {
			attachListeners(targetOrSelector);
			return offCallback;
		}

		for (const target of selectorToIterable(targetOrSelector, options?.container)) {
			attachListeners(target);
		}

		observeMutations(({ addedNodes }) => {
			for (const addedNode of addedNodes) {
				const selectors = targetOrSelector.split(',');
				while(selectors.length > 0) {
					const selector = selectors.pop();

					for (const element of [
						...addedNode.matches(selector) ? [addedNode] : [],
						...addedNode.querySelectorAll(selector)
					]) {
						attachListeners(element);
					}
				}
			}
		});

		return offCallback;
	};

	/** @type {customEventListener} */
	const customEventListener = (eventName, configOrHandler) => {
		customEventListeners[eventName] = typeof configOrHandler === 'function'
			? { on: configOrHandler }
			: configOrHandler;
	};

	/** @type {off} */
	const off = (events, element, listener, options = {}) => {
		const elements = selectorToIterable(element);

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

	/** @type {customEvent} */
	const customEvent = (eventName, eventData, options) => new window.CustomEvent(eventName, {
		detail: eventData,
		cancelable: options?.cancelable ?? false,
		bubbles: options?.bubbles ?? false
	});

	/** @type {dispatch} */
	const dispatch = (eventName, eventData, options) => {
		const event = customEvent(eventName, eventData, options);

		if (typeof customEventListeners[eventName]?.dispatch === 'function') {
			customEventListeners[eventName].dispatch(event);
			return false;
		}

		return (options?.target ?? root).dispatchEvent(event);
	};

	return {
		on,
		off,
		customEventListener,
		dispatch,
		customEvent,
	};
};
