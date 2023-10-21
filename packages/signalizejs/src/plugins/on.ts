import type Signalize from '..';
import type { Selectable } from './select';

declare module '..' {
	interface Signalize {
		on: (
			event: keyof CustomEventListeners,
			targetOrCallback: EventTarget | CallableFunction,
			callbackOrOptions?: CallableFunction | AddEventListenerOptions,
			options?: AddEventListenerOptions
		) => void
		customEventListeners: Record<string, CustomEventListener>
	}
}

export type EventTarget = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement | Window;

export type CustomEventListener = (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => void;

export interface CustomEventListeners extends HTMLElementEventMap {
	clickOutside: CustomEventListener
	remove: CustomEventListener
}

export default (signalize: Signalize): void => {
	const { config, selectorToIterable } = signalize;
	const domMutationRemoveListeners = new Set();

	const customEventListeners: Record<string, CustomEventListener> = {
		clickOutside: (target: HTMLElement | string, listener: CallableFunction, options: AddEventListenerOptions) => {
			document.addEventListener('click', (listenerEvent) => {
				const eventTarget = listenerEvent.target as HTMLElement;

				if ((typeof target === 'string' && (eventTarget.matches(target) || eventTarget.closest(target) !== null)) ||
					(target instanceof HTMLElement && target === eventTarget)
				) {
					return
				}

				if (eventTarget !== target && (typeof target === 'string' && (!eventTarget.matches(target) || !eventTarget.closest(target)))) {
					listener(listenerEvent);
				}
			}, options);
		},
		remove: (target: HTMLElement | string, listener: CallableFunction, options: AddEventListenerOptions) => {
			on('dom:mutation:node:removed', (event: CustomEvent) => {
				if (event.detail === target) {
					listener();
				}
			}, { once: true });
		}
	};

	const on = function (
		event: keyof CustomEventListeners,
		targetOrCallback: Selectable | CallableFunction,
		callbackOrOptions?: CallableFunction | AddEventListenerOptions,
		options?: AddEventListenerOptions
	): void {
		const events = event.split(' ').map((event) => event.trim());
		let target: Selectable;
		let callback: CallableFunction;
		const root = config.root ?? document;
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
				console.log(`"${event}"`)
				document.addEventListener(event, (listenerEvent) => {
					const eventTarget = listenerEvent.target as HTMLElement;

					if (eventTarget.matches(target as string) || (eventTarget.closest(target as string) != null)) {
						callback(listenerEvent);
					}
				}, options);
			},
			direct: (event: string, callback: CallableFunction, options: AddEventListenerOptions) => {
				for (const element of selectorToIterable(target)) {
					element.addEventListener(event, callback, options)
				}
			}
		}

		for (const event of events) {
			if (event in signalize.config.customEventListeners) {
				signalize.config.customEventListeners[event].call(this, target, callback, options);
				continue;
			}

			handlers[listenerType](event, callback, options);
		}
	}

	signalize.configure({ customEventListeners })
	signalize.on = on;
}
