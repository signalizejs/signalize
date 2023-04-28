const componentAttribute = 'data-component';
const componentIdAttribute = 'data-component-id';
const refAttribute = 'data-ref';
const componentsRegister = {};
const definedComponents = {};
const signalsRegister = {};
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
const customEventListeners = {
	'clickOutside': (target, callback, options) => {
		document.addEventListener('click', (listenerEvent) => {
			let eventTarget = listenerEvent.target;
			if (!eventTarget.matches(target) && !eventTarget.closest(target)) callback(listenerEvent);
		}, options);
	}
};

const bind = (target, attributes) => {
	for (const element of normalizeTargets(target)) {
		for (const [attribute, options] of Object.entries(attributes)) {
			const optionsIsArray = Array.isArray(options);
			let callback = null;
			let signalsToWatch = [options];

			if (optionsIsArray) {
				callback = options[options.length - 1];
				signalsToWatch = options.slice(0, options.length -1);
			} else if (typeof options === 'function') {
				callback = options;
			}

			for (const signalToWatch of signalsToWatch) {

				signalToWatch.watch((data) => {
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

			if (optionsIsArray) continue;

			if (reactiveInputAttributes.includes(attribute)) {
				const isNumericInput = numericInputAttributes.includes(element.getAttribute('type'));
				element.addEventListener('input', () => {
					let newValue = element[attribute];
					if (isNumericInput) newValue = Number(newValue);
					signalsToWatch[0].set(newValue);
				});
			}
		}
	}
}

function Signal ({ defaultValue, globalName, globallySettable, equals, } = { }) {
	let value = defaultValue;
	const watchers = new Set();

	const get = () => value;
	const set = (newValue, initializer) => {
		const oldValue = value;

		if ((equals ?? true) && newValue === oldValue) return;

		value = newValue;
		for (const watcher of watchers) watcher({ newValue, oldValue, initializer });
	};

	const watch = (callback, immediate = false) => {
		watchers.add(callback);
		if (immediate) callback({ newValue: value });
		return () => watchers.delete(callback);
	}

	if (globalName !== undefined) {
		if (globalName in signalsRegister) throw new Error(`Global signal "${globalName}" already defined.`);
		const signal = signal(defaultValue);

		signalsRegister[globalName] = [
			signal.get,
			(newValue, initializer) => {
				if (globallySettable ?? false) throw new Error(`Global signal "${config.id}" is not writable.`);
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

const signal = (defaultValue, options = {}) => {
	const signal = new Signal({
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

const normalizeTargets = (target) => {
	let elements = target;
	const elementsTypeIsString = typeof elements === 'string';

	if (elementsTypeIsString) {
		elements = document.querySelectorAll(target);
	} else if (elements instanceof HTMLElement || elements instanceof Document) {
		elements = [elements];
	}

	return elements;
}

const on = (event, target, callback, options = {}) => {
	const events = event.split(',');
	const listenerType = typeof target === 'string' ? 'global' : 'direct';
	const handlers = {
		'global': (event, callback, options) => {
			document.addEventListener(event, (listenerEvent) => {
				let eventTarget = listenerEvent.target;
				if (eventTarget.matches(target) || eventTarget.closest(target)) callback(listenerEvent);
			}, options);
		},
		'direct': (event, callback, options) => {
			for (const element of normalizeTargets(target)) element.addEventListener(event, callback, options);
		}
	}

	for (const event of events) {
		if (event in customEventListeners) {
			customEventListeners[event](target, callback, options);
			continue;
		}
		handlers[listenerType](event, callback, options);
	}
}

const ref = (id, { root, componentId } = {} ) => {
	root = root ?? document;
	let items = [...root.querySelectorAll(`[${refAttribute}="${id}"]`)];

	items = items.filter((ref) => {
		const closestComponent = ref.closest(`[${componentAttribute}]`);
		const closestComponentName = closestComponent?.getAttribute(componentAttribute) ?? null;

		if (componentId === undefined) {
			if (closestComponent) throw new Error(`You are trying to access ref "${id}" of component "${componentName}" from global scope.`);
		} else {
			const closestComponentIsParent = closestComponent.getAttribute(componentIdAttribute) === String(componentId);
			if (!closestComponentIsParent) throw new Error(`You are trying to access ref "${id}" it's parent is "${closestComponentName}".`);
		}

		return true;
	})

	return items.length > 1 ? items : items[0] ?? [];
}

const dispatch = (eventName, eventData = undefined) => {
	document.dispatchEvent(
		new window.CustomEvent(eventName, eventData === undefined ? eventData : { detail: eventData })
	);
};

const onDomReady = (callback) => document.readyState !== 'loading'
	? callback()
	: document.addEventListener('DOMContentLoaded', callback);

onDomReady(() => {
	const createComponent = (el) => {
		const componentName = el.getAttribute(componentAttribute);
		const initFn = definedComponents[componentName] ?? undefined;

		if (initFn === undefined) throw new Error(`Component "${componentName}" is not defined.`);

		const componentId = Object.keys(componentsRegister).length;
		const props = {};
		const onEmitListeners = new Set();
		const onRemoveListeners = new Set();
		const parentComponentId = el.parentElement.closest(`[${componentAttribute}]`)?.dataset.componentId;

		const defineProp = (name, defaultValue) => {
			if (typeof props[name] !== 'undefined') defaultValue = props[name];

			const {get, set, watch } = signal(defaultValue);
			props[name] = set;
			return { get, watch }
		}

		const setProp = (name, value) => name in props ? props[name](value) : props[name] = value;

		componentsRegister[componentId] = {
			setProp,
			onEmit: (options) => {
				for (const listener of onEmitListeners) listener(options)
			},
		}

		const emit = (event, data) => componentsRegister[parentComponentId]?.onEmit({
			component: componentName,
			event,
			data
		});

		el.setAttribute(componentIdAttribute, componentId);

		if (parentComponentId !== undefined) emit('beforeInit', { setProp });

		on('domMutation:nodeRemoved', document, ({ detail }) => {
			if (el === detail) for (const listener of onRemoveListeners) listener();
		});

		initFn({
			el,
			defineProp,
			emit,
			id: componentId,
			ref: (...args) => ref.apply(undefined, [...args, { root: el, componentId}]),
			onEmit: (listener) => onEmitListeners.add(listener),
			onRemove: (listener) => {onRemoveListeners.add(listener)}
		});
	}

	for (const el of document.querySelectorAll(`[${componentAttribute}]`)) createComponent(el);

	new MutationObserver((mutationList) => {
		for (const mutation of mutationList) {
			dispatch('domMutation', mutation);

			if (mutation.type === 'attributes') {
				continue;
			} else {
				for (const node of mutation.removedNodes) dispatch('domMutation:nodeRemoved', node);

				for (const node of mutation.addedNodes) dispatch('domMutation:nodeAdded', node);
			}
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLElement) || !node.hasAttribute(componentAttribute)) continue;
				createComponent(node);
			}
		}
	}).observe(document, { childList: true, subtree: true, attributes: true });
});
