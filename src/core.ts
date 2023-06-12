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

type SignalWatcher<T> = (options: SignalWatcherArguments<T>) => void;

interface SignalWatcherArguments<T> {
	newValue: T | undefined
	oldValue?: T
	initializer?: string
}

interface SignalArguments<T> {
	defaultValue?: T|undefined,
	globalName?: string
	globallySettable?: boolean
	equals?: boolean
}

interface ComponentInitFunctionArguments {
	el: HTMLElement;
	parentComponentEl: HTMLElement | undefined;
	parentComponentId: string | undefined;
	id: string
	ref: <T extends HTMLElement>(id: string) => T,
	refs: <T extends HTMLElement>(id: string) => T[],
	onRemove: (listener: CallableFunction) => void
}

type ComponentInitFunction = (data: ComponentInitFunctionArguments) => void;

export type CustomEventListener = (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => void;

interface CustomEventListeners extends HTMLElementEventMap {
	clickOutside: CustomEventListener,
	remove: CustomEventListener
}

const componentAttribute = 'data-component';
const componentIdAttribute = 'data-component-id';
const refAttribute = 'data-ref';
const initializedComponents: Record<string, InitializedComponent> = {};
const definedComponents: Record<string, ComponentInitFunction> = {};
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
export const definedSignals: Record<string, Signal<any>> = {};
export const $customEventListeners: Record<string, CustomEventListener> = {
	'clickOutside': (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => {
		document.addEventListener('click', (listenerEvent) => {
			let eventTarget = listenerEvent.target;

			if (!eventTarget.matches(target) && !eventTarget.closest(target)) {
				callback(listenerEvent);
			}

		}, options);
	},
	'remove': (target: HTMLElement, callback: CallableFunction, options: AddEventListenerOptions) => {
		document.addEventListener('click', (listenerEvent) => {
			let eventTarget = listenerEvent.target as HTMLElement

			if (!eventTarget.matches(target) && !eventTarget.closest(target)) {
				callback();
			}
		}, options);
	}
};

/* ------------------------- Signals and binding ------------------------- */

export const bind = (target: EventTarget, attributes: Record<string, any>) => {
	for (const element of normalizeTargets(target, true) as HTMLElement[]) {
		for (const [attr, attrOptions] of Object.entries(attributes)) {
			const optionsIsArray = attrOptions instanceof Array;
			let callback: CallableFunction|null = null;
			let attrOptionsAsArray = [attrOptions];

			if (optionsIsArray) {
				callback = attrOptions[attrOptions.length - 1];
				attrOptionsAsArray = attrOptions.slice(0, attrOptions.length -1);
			} else if (typeof attrOptions === 'function') {
				callback = attrOptions;
			}

			for (const attrOption of attrOptionsAsArray) {
				if (['string', 'number'].includes(typeof attrOption)) {
					element.setAttribute(attr, attrOption);
					continue;
				}
				attrOption.watch((data: any) => {
					const content = callback ? callback({ el: element }) : data.newValue;
					if (textContentAttributes.includes(attr)) {
						element[attr] = content;
					} else if (booleanAttributes.includes(attr)) {
						element[attr] = !!content;
					} else {
						element.setAttribute(attr, content);
					}
				}, true)
			}

			if (optionsIsArray) {
				continue
			};

			if (reactiveInputAttributes.includes(attr)) {
				const isNumericInput = numericInputAttributes.includes(element.getAttribute('type') ?? '');
				element.addEventListener('input', () => {
					let newValue = element[attr];
					if (isNumericInput) {
						newValue = Number(newValue)
					};
					attrOptionsAsArray[0].set(newValue);
				});
			}
		}
	}
}
export class Signal<T> {
	private _watchers: Set<SignalWatcher<T>> = new Set();
	private _value: T | undefined;

	constructor({ defaultValue, globalName, globallySettable }: SignalArguments<T> = { }) {
		this._value = defaultValue

		if (globalName !== undefined) {
			if (globalName in definedSignals) {
				throw new Error(`Global signal "${globalName}" already defined.`);
			}
			const globalSignal = signal<T>(defaultValue);
			const originalSet = globalSignal.set;
			globalSignal.set = (newValue: T, initializer?: string) => {
				if (globallySettable ?? false) {
					throw new Error(`Global signal "${globalName}" is not writable.`);
				}
				originalSet(newValue, initializer);
			};
			definedSignals[globalName] = globalSignal;
		}
	}

	public get() {
		return this._value;
	}

	public set(newValue: T, initializer?: string) {
		const oldValue = this._value;

		if (newValue === oldValue) return;

		this._value = newValue;
		for (const watcher of this._watchers) {
			watcher({ newValue, oldValue, initializer });
		};
	}

	public watch(callback: SignalWatcher<T>, immediate = false) {
		this._watchers.add(callback);

		if (immediate) {
			callback({ newValue: this._value });
		};

		return () => this._watchers.delete(callback);
	}

	public toString() {
		return String(this.get());
	}

	public toJSON() {
		return this.get();
	}

	public valueOf() {
		return this.get();
	}
}

export const signal = <T>(defaultValue: T|undefined, options = {}) => new Signal<T>({
	defaultValue,
	...options
});

/* ------------------------- Components ------------------------- */

export const component = (name: string, init: ComponentInitFunction) => {
	if (name in definedComponents) throw new Error(`Component "${name}" already defined.`);
	definedComponents[name] = init;
}

/* ------------------------- Selectors ------------------------- */

const normalizeTargets = (target: EventTarget, normalizeDocument = false): (HTMLElement|Document)[] => {
	let elements: (HTMLElement|Document)[];

	if (typeof target === 'string') {
		elements = [...document.querySelectorAll<HTMLElement>(target)];
	} else {
		const targetIsDocument = target instanceof Document;
		if (target instanceof HTMLElement || targetIsDocument) {
			elements = [targetIsDocument && normalizeDocument ? target.documentElement : target]
		} else {
			elements = [...target];
		}
	}

	return elements as (HTMLElement|Document)[];
}

export const selectAll = <T extends HTMLElement>(selector: string, root = document.documentElement): NodeListOf<T> => {
	return root.querySelectorAll<T>(selector);
}

export const select = <T extends HTMLElement>(selector: string, root = document.documentElement): T | null => {
	return root.querySelector<T>(selector);
}

export const refs = <T extends HTMLElement>(
	id: string,
	{ root, componentId }: {root?: HTMLElement, componentId?: string} = {}
): T[] => {
	let items = selectAll<T>(`[${refAttribute}="${id}"]`, root ?? document.documentElement);

	return [...items].filter((ref) => {
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
	});
}

export const ref = <T extends HTMLElement>(
	id: string,
	{ root, componentId }: {root?: HTMLElement, componentId?: string} = {}
): T => {
	return (refs(id, { root, componentId })[0] ?? null) as T
};

/* ------------------------- Events ------------------------- */

export const on = (
	event: keyof CustomEventListeners,
	target: EventTarget,
	callback: CallableFunction,
	options: AddEventListenerOptions = {}
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

export const dispatch = (eventName: string, eventData: any = undefined, target = document): void => {
	target.dispatchEvent(
		new window.CustomEvent(eventName, eventData === undefined ? eventData : { detail: eventData })
	);
};

/* ------------------------- HTML ------------------------- */

export const createHtml = (html: string): DocumentFragment => {
	const template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content;
}

/* ------------------------- JSON ------------------------- */

export const isJson = (content: any): boolean => {
	try {
		JSON.parse(content);
	} catch (e) {
		return false;
	}
	return true;
}

/* ------------------------- DOM READY ------------------------- */

let onDomReadyListeners: CallableFunction[] = [];
const callOnDomReadyListeners = () => {
	for (const onDomReadyListener of onDomReadyListeners) {
		onDomReadyListener();
	}

	onDomReadyListeners = [];
}

const documentIsDefined = typeof document !== 'undefined';
const documentIsReady = documentIsDefined && document.readyState !== 'loading';

export const onDomReady = (callback: CallableFunction): void => {
	if (documentIsDefined) {
		callback()
	} else {
		onDomReadyListeners.push(callback);
	}
}

if (documentIsDefined) {
	if (documentIsReady) {
		callOnDomReadyListeners()
	} else {
		document.addEventListener('DOMContentLoaded', () => callOnDomReadyListeners())
	}
}

onDomReady(() => {
	const createComponent = (el: HTMLElement): void => {
		const componentName = el.getAttribute(componentAttribute) as string;
		const initFn = definedComponents[componentName] ?? undefined;

		if (initFn === undefined) {
			throw new Error(`Component "${componentName}" is not defined.`);
		}

		const componentId = String(Object.keys(initializedComponents).length);
		const onRemoveListeners: Set<CallableFunction> = new Set();
		const parentComponentEl = el.parentElement?.closest<HTMLElement>(`[${componentAttribute}]`) ?? undefined;

		el.setAttribute(componentIdAttribute, componentId);

		on('remove', el, () => {
			for (const listener of onRemoveListeners) {
				listener();
			}
		});

		initFn({
			el,
			parentComponentEl,
			parentComponentId: parentComponentEl?.dataset.componentId ?? undefined,
			id: componentId,
			ref: <T>(id: string) => ref.call(undefined, id, { root: el, componentId}) as T,
			refs: <T>(id: string) => refs.call(undefined, id, { root: el, componentId}) as T,
			onRemove: (listener: CallableFunction) => {onRemoveListeners.add(listener)}
		});
	}

	for (const el of document.querySelectorAll<HTMLElement>(`[${componentAttribute}]`)) {
		createComponent(el);
	};

	new MutationObserver((mutationList): void => {
		for (const mutation of mutationList) {
			dispatch('domMutation', mutation);

			for (const node of mutation.removedNodes) {
				dispatch('domMutation:nodeRemoved', node)
			};

			for (const node of mutation.addedNodes) {
				dispatch('domMutation:nodeAdded', node)

				if (!(node instanceof HTMLElement) || !node.hasAttribute(componentAttribute)) {
					continue;
				}

				createComponent(node);
			};
		}

	}).observe(document, { childList: true, subtree: true, attributes: true });
});

const Islands = {
	$customEventListeners,
	Signal,
	bind,
	component,
	createHtml,
	dispatch,
	isJson,
	ref,
	refs,
	select,
	selectAll,
	signal,
	on,
	onDomReady
}

if (typeof window !== 'undefined') {
	window.Islands = Islands
	window.$i = Islands
}

export default Islands;
