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

	interface CustomEventListeners extends HTMLElementEventMap {
		remove: CustomEventListener
		clickOutside: CustomEventListener
	}
}

export type EventTarget = string | NodeListOf<Element> | Element[] | Element | Window;

export type CustomEventListener = (args: CustomEventListenerArgs) => void;

export interface CustomEventListenerArgs {
	target: Element,
	listener: CallableFunction,
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
		clickOutside: ({ target, listener, options }) => {
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
		remove: ({ target, listener }) => {
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
		let listener: CallableFunction;
		const root = $.root ?? document;
		options = typeof callbackOrOptions === 'function' ? options : callbackOrOptions;

		if (typeof targetOrCallback === 'function') {
			target = root;
			listener = targetOrCallback;
		} else {
			target = targetOrCallback
			listener = callbackOrOptions as CallableFunction;
		}

		const listenerType = typeof target === 'string' ? 'global' : 'direct';
		const handlers: Record<string, CustomEventListener> = {
			global: ({ target, listener, options }) => {
				document.addEventListener(event, (listenerEvent) => {
					const eventTarget = listenerEvent.target as Element;

					if (eventTarget.matches(target as string) || (eventTarget.closest(target as string) != null)) {
						listener(listenerEvent);
					}
				}, options);
			},
			direct: ({ target, listener, options }) => {
				for (const element of $.selectorToIterable(target)) {
					element.addEventListener(event, listener, options)
				}
			}
		}

		for (const event of events) {
			const listenerData: CustomEventListenerArgs = { event, target, listener, options };
			if (event in customEventListeners) {
				customEventListeners[event].call(this, listenerData);
				continue;
			}

			handlers[listenerType](listenerData);
		}
	}

	$.customEventListener = (name, listener) => {
		customEventListeners[name] = listener
	}

	$.on = on;
}
