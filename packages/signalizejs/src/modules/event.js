/**
 * @type {import('../../types/Signalize').Module<
 *   import('../../types/modules/event').EventModule,
 *   import('../../types/modules/event').EventConfig
 * >}
 */
export default async ({ root, resolve }) => {
	/**
	 * @type {{
	 *  observeMutations: import('../../types/index').observeMutations
	 * }}
	 */
	const { observeMutations } = await resolve('mutation-observer');

	/** @type {Record<string, import('../../types/modules/event').CustomEventListenerConfig>} */
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
	 * @param {Element|string|Array<Element|string>|NodeList} target
	 * @param {boolean} container
	 * @returns {Element[]}
	 */
	const selectorToIterable = (target, container) => {
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

	/** @type {import('../../types/index').on} */
	const on = (events, targetOrCallback, callbackOrOptions, options) => {
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

		/** @param {Element|Document} target */
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

	/** @type {import('../../types/modules/event').customEventListener} */
	const customEventListener = (eventName, configOrHandler) => {
		customEventListeners[eventName] = typeof configOrHandler === 'function'
			? { on: configOrHandler }
			: configOrHandler;
	};

	/** @type {import('../../types/modules/event').off} */
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

	/** @type {import('../../types/modules/event').customEvent} */
	const customEvent = (eventName, eventData, options) => new window.CustomEvent(eventName, {
		detail: eventData,
		cancelable: options?.cancelable ?? false,
		bubbles: options?.bubbles ?? false
	});

	/** @type {import('../../types/modules/event').dispatch} */
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
