import type { Signalize } from '..'

declare module '..' {
	interface Signalize {
		bind: (target: EventTarget, attributes: Record<string, any>) => void
	}
}

export default ($: Signalize): void => {
	const { scope, on, Signal, Scope } = $;

	const reactiveInputAttributes = ['value', 'checked'];
	const numericInputAttributes = ['range', 'number'];
	const textContentAttributes = ['value', 'innerHTML', 'textContent', 'innerText'];
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
	const attributesAliases = {
		text: 'textContent',
		html: 'innerHTML'
	}

	$.bind = (element, attributes) => {
		const unwatchSignalCallbacks: CallableFunction[] = [];

		for (let [attr, attrOptions] of Object.entries(attributes)) {
			if (attrOptions.length === 1) {
				attrOptions = attrOptions[0];
			}

			const attrOptionsAsArray = Array.isArray(attrOptions) ? attrOptions : [attrOptions];
			const isNumericInput = numericInputAttributes.includes(element.getAttribute('type') ?? '');
			const attributeBinder = attrOptionsAsArray.pop();
			const signalsToWatch = attrOptionsAsArray;
			const attributeBinderType = typeof attributeBinder;
			const attributeBinderIsSignal = attributeBinder instanceof Signal;
			let attributeInited = false;
			let previousSettedValue: any;
			let previousValue;

			const setAttribute = async (attribute, value): Promise<void> => {
				value = value instanceof Promise ? await value : value;
				if (attributeInited && previousValue === value) {
					return;
				}
				previousValue = value;
				attribute = attributesAliases[attribute] ?? attribute;

				if (textContentAttributes.includes(attribute)) {
					element[attribute] = value;
				} else if (booleanAttributes.includes(attribute)) {
					element[attribute] = !!value;
				} else if (attribute === 'class') {
					if (attributeInited) {
						if (previousSettedValue !== undefined && previousSettedValue.length > 0) {
							element.classList.remove(previousSettedValue);
						}
					}

					const valueToSet = value.trim();

					if (valueToSet.length > 0) {
						element.classList.add(value);
						previousSettedValue = valueToSet;
					}
				} else {
					element.setAttribute(attribute, value);
				}
				attributeInited = true;
			}

			if (['string', 'number'].includes(attributeBinderType)) {
				setAttribute(attr, attributeBinder);
				continue;
			}

			if (attributeBinderIsSignal) {
				signalsToWatch.push(attributeBinder);
			}

			let getListener: CallableFunction | null = null;
			let setListener: CallableFunction | null = null;
			if (attributeBinderIsSignal) {
				getListener = () => attributeBinder();
				setListener = (value) => attributeBinder(value);
			} else {
				if (typeof attributeBinder?.get === 'function') {
					getListener = () => attributeBinder.get();
				}

				if (typeof attributeBinder?.set === 'function') {
					setListener = (value) => attributeBinder.set(value);
				}

				if (getListener === null) {
					if (typeof attributeBinder === 'function') {
						getListener = () => attributeBinder();
					} else if (signalsToWatch.length === 1) {
						getListener = () => signalsToWatch[0]();
					}
				}

				if (setListener === null && signalsToWatch.length === 1) {
					setListener = (value) => signalsToWatch[0](value);
				}
			}

			if (getListener !== null) {
				setAttribute(attr, getListener());
			}

			for (const signalToWatch of signalsToWatch) {
				unwatchSignalCallbacks.push(
					signalToWatch.watch(() => setAttribute(attr, getListener()))
				);
			}

			if (typeof setListener === 'function' && reactiveInputAttributes.includes(attr)) {
				const inputListener = (): void => {
					setListener(isNumericInput ? Number(element[attr].replace(',', '.') as string) : element[attr] as string);
				};

				on('input', element, inputListener, { passive: true });
			}
		}

		const elementScope = scope(element);
		if (elementScope instanceof Scope) {
			elementScope.cleanup(() => {
				for (const unwatch of unwatchSignalCallbacks) {
					unwatch();
				}
			})
		}
	}
}
