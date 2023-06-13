import { normalizeTargets } from '.';

type EventTarget = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement;

type CustomEventListener = (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => void;

interface CustomEventListeners extends HTMLElementEventMap {
	clickOutside: CustomEventListener
	remove: CustomEventListener
}

const $customEventListeners: Record<string, CustomEventListener> = {
	clickOutside: (target: HTMLElement, listener: CallableFunction, options: AddEventListenerOptions) => {
		document.addEventListener('click', (listenerEvent) => {
			const eventTarget = listenerEvent.target;

			if (!eventTarget.matches(target) && !eventTarget.closest(target)) {
				listener(listenerEvent);
			}
		}, options);
	},
	remove: (target: HTMLElement, listener: CallableFunction, options: AddEventListenerOptions) => {
		document.addEventListener('click', (listenerEvent) => {
			const eventTarget = listenerEvent.target as HTMLElement

			if (!eventTarget.matches(target) && (eventTarget.closest(target) == null)) {
				listener();
			}
		}, options);
	}
};

export const on = (
	event: keyof CustomEventListeners,
	target: EventTarget,
	callback: CallableFunction,
	options: AddEventListenerOptions = {}
): void => {
	const events = event.split(',');
	const listenerType = typeof target === 'string' ? 'global' : 'direct';
	const handlers = {
		global: (event: string, callback: CallableFunction, options: AddEventListenerOptions) => {
			document.addEventListener(event, (listenerEvent) => {
				const eventTarget = listenerEvent.target as HTMLElement;

				if (eventTarget.matches(target as string) || (eventTarget.closest(target as string) != null)) {
					callback(listenerEvent);
				}
			}, options);
		},
		direct: (event: string, callback: CallableFunction, options: AddEventListenerOptions) => {
			for (const element of normalizeTargets(target)) {
				element.addEventListener(event, callback, options)
			}
		}
	}

	for (const event of events) {
		if (event in $customEventListeners) {
			$customEventListeners[event](target, callback, options);
			continue;
		}

		handlers[listenerType](event, callback, options);
	}
}
