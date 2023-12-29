import type { Signalize } from '..';
import type { Selectable } from './select';

declare module '..' {
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

export type EventTarget = string | NodeListOf<Element> | Element[] | Element | Window;

export type CustomEventListener = {
	on: (args: CustomEventListenerArgs) => void
	off?: (args: CustomEventListenerArgs) => void
}

export interface CustomEventListenerArgs {
	target: Element
	listener: CallableFunction
	options: AddEventListenerOptions
	event: string
}

export interface CustomEventListeners extends ElementEventMap {
	clickOutside: CustomEventListener
	remove: CustomEventListener
}

export interface PluginOptions {
	customEventListeners: Record<string, CustomEventListener>
}

export default ($: Signalize): void => {
	const customEventListeners: Record<string, CustomEventListener> = {
		clickOutside: {
			on: ({ target, listener, options }) => {
				document.addEventListener('click', (listenerEvent) => {
					const eventTarget = listenerEvent.target as Element;

					if ((typeof target === 'string' && (eventTarget.matches(target) || eventTarget.closest(target) !== null)) ||
						(target instanceof Element && target === eventTarget)
					) {
						return
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
				}

				on('dom:mutation:node:removed', callback, { passive: true });
			}
		}
	}

	const on = (
		events: keyof CustomEventListeners,
		targetOrCallback: EventTarget | CallableFunction,
		callbackOrOptions?: CallableFunction | AddEventListenerOptions,
		options?: AddEventListenerOptions
	): void => {
		let target: Selectable;
		let listener: CallableFunction;
		options = typeof callbackOrOptions === 'function' ? options : callbackOrOptions;

		if (typeof targetOrCallback === 'function') {
			target = $.root;
			listener = targetOrCallback;
		} else {
			target = targetOrCallback
			listener = callbackOrOptions as CallableFunction;
		}

		const listenerType = typeof target === 'string' ? 'global' : 'direct';
		const handlers: Record<string, CustomEventListener> = {
			global: ({ target, listener, options }) => {
				document.addEventListener(events, (listenerEvent) => {
					const eventTarget = listenerEvent.target as Element;

					if (eventTarget.matches(target as string) || (eventTarget.closest(target as string) != null)) {
						listener(listenerEvent);
					}
				}, options);
			},
			direct: ({ target, listener, options }) => {
				for (const element of $.selectorToIterable(target)) {
					element.addEventListener(events, listener, options)
				}
			}
		}

		for (const event of events.split(' ').map((event) => event.trim())) {
			const listenerData: CustomEventListenerArgs = { event, target, listener, options };

			if (event in customEventListeners) {
				if (options?.once === true) {
					listenerData.listener = (...args) => {
						listener.apply(undefined, args);
						customEventListeners[event]?.off(listenerData);
					}
				}
				customEventListeners[event].on(listenerData);
				continue;
			}

			handlers[listenerType](listenerData);
		}
	}

	$.customEventListener = (name, config) => {
		customEventListeners[name] = config;
	}

	$.off = (events, element, listener, options = {}) => {
		const elements = $.selectorToIterable(element);

		for (const event of events.split(' ')) {
			if (event in customEventListeners) {
				customEventListeners[event]?.off({ event, target: element, listener, options })
				continue;
			}

			for (const element of elements) {
				element.removeEventListener(event, listener, options);
			}
		}
	}

	$.on = on;
}
