import type Signalize from '..';

declare module '..' {
	interface Signalize {
		on: (
			event: keyof CustomEventListeners,
			targetOrCallback: EventTarget | CallableFunction,
			callbackOrOptions?: CallableFunction | AddEventListenerOptions,
			options?: AddEventListenerOptions
		) => void
	}
}

export type EventTarget = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement | Window;

export type CustomEventListener = (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => void;

interface CustomEventListeners extends HTMLElementEventMap {
	clickOutside: CustomEventListener
	remove: CustomEventListener
	'directive:beforeProcess': CustomEventListener
	'dom-mutation': CustomEventListener
	'dom-mutation:node:added': CustomEventListener
	'dom-mutation:node:removed': CustomEventListener
}

export default (signalize: Signalize): void => {
	const { onDomReady, config, normalizeTargets } = signalize;
	const domMutationRemoveListeners = new Set();

	const $customEventListeners: Record<string, CustomEventListener> = {
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
			const observer = new MutationObserver((mutationsList, observer) => {
				for (const mutation of mutationsList) {
					if (mutation.type === 'childList') {
						if ([...mutation.removedNodes].includes(target)) {
							listener();
						}
					}
				}
			});

			observer.observe(config.root, { childList: true, subtree: true });
		}
	};

	const on = function (
		event: keyof CustomEventListeners,
		targetOrCallback: EventTarget | CallableFunction,
		callbackOrOptions?: CallableFunction | AddEventListenerOptions,
		options?: AddEventListenerOptions
	): void {
		const events = event.split(',');
		let target: EventTarget;
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
				root.addEventListener(event, (listenerEvent) => {
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
				$customEventListeners[event].call(this, target, callback, options);
				continue;
			}

			handlers[listenerType](event, callback, options);
		}
	}

	onDomReady(() => {
		on('dom-mutation:node:removed', (event) => {
			for (const listener of domMutationRemoveListeners) {
				listener(event);
			}
		})
	});

	signalize.on = on;
}
