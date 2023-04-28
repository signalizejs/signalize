type EventTarget = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement;
interface OnComponentEmitListenerArguments {
	component: string;
	event: string;
	data: any;
}

type OnComponentEmitListener = (options: OnComponentEmitListenerArguments) => void;
interface InitializedComponent {
	setProp: CallableFunction;
	onEmit: OnComponentEmitListener;
}

type SignalWatcher<T> = <T>(options: SignalWatcherArguments<T>) => () => void;

interface SignalWatcherArguments<T> {
	newValue: T
	oldValue?: T
	initializer?: string
}

interface SignalArguments<T> {
	defaultValue?: T
	globalName?: string
	globallySettable?: boolean
	equals?: boolean
}

interface SignalReturn<T> {
	get: () => T;
	set: (newValue: T, initializer?: string) => void;
	watch: (callback: SignalWatcher<T>, immediate: boolean) => () => boolean;
	valueOf: () => T;
	toString: () => string,
	toJSON: () => T,
}

type CustomEventListener = (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => void;

interface CustomEventListeners extends HTMLElementEventMap {
	clickOutside: CustomEventListener,
	remove: CustomEventListener
}

const componentAttribute = 'data-component';
const componentIdAttribute = 'data-component-id';
const refAttribute = 'data-ref';
const initializedComponents: Record<string, InitializedComponent> = {};
const definedComponents = {};
const textContentAttributes = ['innerHTML', 'textContent', 'innerText'];
const booleanAttributes = [
	'autofocus', 'autoplay',
	'checked', 'controls',
	'default', 'defer', 'disabled',
	'formnovalidate',
	'hidden',
	'ismap',
	'loop',
	'multiple', 'muted',
	'novalidate',
	'open',
	'readonly', 'required', 'reversed',
	'scoped', 'seamless', 'selected',
	'typemustmatch'
];

const reactiveInputAttributes = ['value', 'checked'];
const numericInputAttributes = ['range', 'number'];
const $signals = {};
const $customEventListeners: Record<string, CustomEventListener> = {
	'clickOutside': (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => {
		document.addEventListener('click', (listenerEvent) => {
			let eventTarget = listenerEvent.target;

			if (!eventTarget.matches(target) && !eventTarget.closest(target)) {
				callback(listenerEvent);
			}

		}, options);
	},
	'remove': (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => {
		document.addEventListener('click', ({ detail }) => {
			if (target === detail) {
				callback();
			}
		});
	}
};

const bind = (target: EventTarget, attributes: Record<string, any>) => {
	for (const element of normalizeTargets(target)) {
		for (const [attribute, options] of Object.entries(attributes)) {
			const optionsIsArray = Array.isArray(options);
			let callback: CallableFunction|null = null;
			let signalsToWatch = [options];

			if (optionsIsArray) {
				callback = options[options.length - 1];
				signalsToWatch = options.slice(0, options.length -1);
			} else if (typeof options === 'function') {
				callback = options;
			}

			for (const signalToWatch of signalsToWatch) {
				signalToWatch.watch((data: any) => {
					const content = callback ? callback({ el: element }) : data.newValue;
					if (textContentAttributes.includes(attribute)) {
						element[attribute] = content;
					} else if (booleanAttributes.includes(attribute)) {
						element[attribute] = !!content;
					} else {
						element.setAttribute(attribute, content);
					}
				}, true)
			}

			if (optionsIsArray) {
				continue
			};

			if (reactiveInputAttributes.includes(attribute)) {
				const isNumericInput = numericInputAttributes.includes(element.getAttribute('type') ?? '');
				element.addEventListener('input', () => {
					let newValue = element[attribute];
					if (isNumericInput) {
						newValue = Number(newValue)
					};
					signalsToWatch[0].set(newValue);
				});
			}
		}
	}
}

function Signal <T>({ defaultValue, globalName, globallySettable, equals }: SignalArguments<T> = { }): SignalReturn<T> {
	let value = defaultValue as T;
	const watchers: Set<SignalWatcher<T>> = new Set();

	const get = (): T => value;
	const set = (newValue: T, initializer?: string): void => {
		const oldValue = value;

		if ((equals ?? true) && newValue === oldValue) return;

		value = newValue;
		for (const watcher of watchers) {
			watcher({ newValue, oldValue, initializer });
		};
	};

	const watch = (callback: SignalWatcher<T>, immediate = false) => {
		watchers.add(callback);

		if (immediate) {
			callback({ newValue: value });
		};

		return () => watchers.delete(callback);
	}

	if (globalName !== undefined) {
		if (globalName in $signals) {
			throw new Error(`Global signal "${globalName}" already defined.`);
		}
		const signal = signal(defaultValue);

		$signals[globalName] = [
			signal.get,
			(newValue: T, initializer?: string) => {
				if (globallySettable ?? false) {
					throw new Error(`Global signal "${globalName}" is not writable.`);
				}
				signal.set(newValue, initializer);
			},
			signal.watch
		];
	}

	return {
		get, set, watch,
		toString: () => String(get()),
		toJSON: get,
		valueOf: get
	};
};

const signal = <T>(defaultValue: T, options = {}) => {
	const signal = Signal<T>({
		defaultValue,
		...options
	});
	//signal.toString = signal.get;
	return signal;
};

const component = (name, init) => {
	if (name in definedComponents) throw new Error(`Component "${name}" already defined.`);
	definedComponents[name] = init;
}

const normalizeTargets = (target: EventTarget): HTMLElement[] => {
	let elements: HTMLElement[];

	if (typeof target === 'string') {
		elements = [...document.querySelectorAll<HTMLElement>(target)];
	} else {
		const targetIsDocument = target instanceof Document;
		if (target instanceof HTMLElement || targetIsDocument) {
			elements = [targetIsDocument ? target.documentElement : target]
		} else {
			elements = [...target];
		}
	}

	return elements as HTMLElement[];
}

const on = (
	event: keyof CustomEventListeners,
	target: EventTarget, callback: CallableFunction, options: AddEventListenerOptions = {}
) => {
	const events = event.split(',');
	const listenerType = typeof target === 'string' ? 'global' : 'direct';
	const handlers = {
		'global': (event: string, callback: CallableFunction, options: AddEventListenerOptions) => {
			document.addEventListener(event, (listenerEvent) => {
				let eventTarget = listenerEvent.target as HTMLElement;

				if (eventTarget.matches(target as string) || eventTarget.closest(target as string)) {
					callback(listenerEvent);
				}

			}, options);
		},
		'direct': (event: string, callback: CallableFunction, options: AddEventListenerOptions) => {
			for (const element of normalizeTargets(target)) {
				element.addEventListener(event, callback, options)
			};
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

const ref = <T extends HTMLElement>(
	id: string,
	{ root, componentId }: {root?: HTMLElement, componentId?: string} = {}
): T | T[] => {
	root = root ?? document.documentElement;
	let items = [...root.querySelectorAll<T>(`[${refAttribute}="${id}"]`)];

	items = items.filter((ref) => {
		const closestComponent = ref.closest(`[${componentAttribute}]`);
		const closestComponentName = closestComponent?.getAttribute(componentAttribute) ?? null;

		if (closestComponent) {
			if (componentId === undefined) {
				throw new Error(`You are trying to access ref "${id}" of component "${closestComponentName}" from global scope.`)
			} else {
				const closestComponentIsParent = closestComponent.getAttribute(componentIdAttribute) === String(componentId);
				if (!closestComponentIsParent) {
					throw new Error(`You are trying to access ref "${id}" it's parent is "${closestComponentName}".`)
				};
			}
		}

		return true;
	})

	return items.length > 1 ? items : items[0] ?? [];
}

const dispatch = (eventName: string, eventData: any = undefined): void => {
	document.dispatchEvent(
		new window.CustomEvent(eventName, eventData === undefined ? eventData : { detail: eventData })
	);
};

const onDomReady = (callback: CallableFunction): void => {
	if (typeof document === 'undefined') {
		return;
	}

	document.readyState !== 'loading'
		? callback()
		: document.addEventListener('DOMContentLoaded', (event) => callback(event));
}

onDomReady(() => {
	const createComponent = (el: HTMLElement): void => {
		const componentName = el.getAttribute(componentAttribute) as string;
		const initFn = definedComponents[componentName] ?? undefined;

		if (initFn === undefined) {
			throw new Error(`Component "${componentName}" is not defined.`);
		}

		const componentId = Object.keys(initializedComponents).length;
		const props = {};
		const onEmitListeners: Set<OnComponentEmitListener> = new Set();
		const onRemoveListeners: Set<CallableFunction> = new Set();
		const parentComponentId = el.parentElement?.closest<HTMLElement>(`[${componentAttribute}]`)?.dataset.componentId

		const defineProp = <T>(name: string, defaultValue: T) => {
			if (typeof props[name] !== 'undefined') defaultValue = props[name];

			const {get, set, watch } = signal(defaultValue);
			props[name] = set;
			return { get, watch }
		}

		const setProp = <T>(name: string, value: T) => name in props ? props[name](value) : props[name] = value;

		initializedComponents[componentId] = {
			setProp,
			onEmit: (options: OnComponentEmitListenerArguments) => {
				for (const listener of onEmitListeners) {
					listener(options);
				}
			},
		}

		const emit = <T>(event: string, data: T) => parentComponentId === undefined
			? () => {}
			: initializedComponents[parentComponentId]?.onEmit({
				component: componentName,
				event,
				data
			});

		el.setAttribute(componentIdAttribute, String(componentId));

		if (parentComponentId !== undefined) {
			emit('beforeInit', { setProp });
		};

		on('remove', el, () => {
			for (const listener of onRemoveListeners) {
				listener();
			}
		});

		initFn({
			el,
			defineProp,
			emit,
			id: componentId,
			ref: (id: string) => ref.call(undefined, id, { root: el, componentId}),
			onEmit: (listener: OnComponentEmitListener) => onEmitListeners.add(listener),
			onRemove: (listener: CallableFunction) => {onRemoveListeners.add(listener)}
		});
	}

	for (const el of document.querySelectorAll<HTMLElement>(`[${componentAttribute}]`)) {
		createComponent(el);
	};

	new MutationObserver((mutationList): void => {
		for (const mutation of mutationList) {
			dispatch('domMutation', mutation);

			if (mutation.type === 'attributes') {
				continue;
			} else {
				for (const node of mutation.removedNodes) {
					dispatch('domMutation:nodeRemoved', node)
				};

				for (const node of mutation.addedNodes) {
					dispatch('domMutation:nodeAdded', node)
				};
			}
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLElement) || !node.hasAttribute(componentAttribute)) continue;
				createComponent(node);
			}
		}

	}).observe(document, { childList: true, subtree: true, attributes: true });
});

export {
	bind,
	ref,
	signal,
	dispatch,
	component,
	onDomReady,
	$customEventListeners,
	$signals
}
