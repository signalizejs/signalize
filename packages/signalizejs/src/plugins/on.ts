import type { Signalize, SignalizePlugin } from '..';
import type { Selectable } from './select';

declare module '..' {
	interface Signalize {
		on: (
			event: keyof CustomEventListeners,
			targetOrCallback: EventTarget | CallableFunction,
			callbackOrOptions?: CallableFunction | AddEventListenerOptions,
			options?: AddEventListenerOptions
		) => void
		customEventListener: (name: string, listener: CustomEventListener) => void
	}

	interface CustomEventListeners {
		remove: CustomEventListener
		clickOutside: CustomEventListener
	}
}

export type EventTarget = string | NodeListOf<Element> | Element[] | Element | Window;

export type CustomEventListener = (target: Element, callback: CallableFunction, options: AddEventListenerOptions) => void;

export interface CustomEventListeners extends ElementEventMap {
	clickOutside: CustomEventListener
	remove: CustomEventListener
}

export interface PluginOptions {
	customEventListeners: Record<string, CustomEventListener>
}

export default ($: Signalize): void => {
	const customEventListeners: Record<string, CustomEventListener> = {
		clickOutside: (target: Element | string, listener: CallableFunction, options: AddEventListenerOptions) => {
			document.addEventListener('click', (listenerEvent) => {
				const eventTarget = listenerEvent.target as Element;

				if ((typeof target === 'string' && (eventTarget.matches(target) || eventTarget.closest(target) !== null)) ||
					(target instanceof Element && target === eventTarget)
				) {
					return
				}

				if (eventTarget !== target && (typeof target === 'string' && (!eventTarget.matches(target) || !eventTarget.closest(target)))) {
					listener(listenerEvent);
				}
			}, options);
		},
		remove: (target: Element | string, listener: CallableFunction, options: AddEventListenerOptions) => {
			on('dom:mutation:node:removed', (event: CustomEvent) => {
				if (event.detail === target) {
					listener();
				}
			}, { once: true });
		}
	}

	const on = (
		event: keyof CustomEventListeners,
		targetOrCallback: EventTarget | CallableFunction,
		callbackOrOptions?: CallableFunction | AddEventListenerOptions,
		options?: AddEventListenerOptions
	): void => {
		const events = event.split(' ').map((event) => event.trim());
		let target: Selectable;
		let callback: CallableFunction;
		const root = $.root ?? document;
		options = typeof callbackOrOptions === 'function' ? options : callbackOrOptions;

		if (typeof targetOrCallback === 'function') {
			target = root;
			callback = targetOrCallback;
		} else {
			target = targetOrCallback
			callback = callbackOrOptions as CallableFunction;
		}

		const listenerType = typeof target === 'string' ? 'global' : 'direct';
		const handlers = {
			global: (event: string, callback: CallableFunction, options: AddEventListenerOptions) => {
				document.addEventListener(event, (listenerEvent) => {
					const eventTarget = listenerEvent.target as Element;

					if (eventTarget.matches(target as string) || (eventTarget.closest(target as string) != null)) {
						callback(listenerEvent);
					}
				}, options);
			},
			direct: (event: string, callback: CallableFunction, options: AddEventListenerOptions) => {
				for (const element of $.selectorToIterable(target)) {
					element.addEventListener(event, callback, options)
				}
			}
		}

		for (const event of events) {
			if (event in customEventListeners) {
				customEventListeners[event].call(this, target, callback, options);
				continue;
			}

			handlers[listenerType](event, callback, options);
		}
	}

	$.customEventListener = (name, listener) => {
		customEventListeners[name] = listener
	}

	$.on = on;
}
