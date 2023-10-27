import type Signalize from '..'
import { Scope } from './scope';

declare module '..' {
	interface Signalize {
		bind: (target: EventTarget, attributes: Record<string, any>) => void
	}
}

export default (signalize: Signalize): void => {
	const { selectorToIterable, scope, Signal, on, off } = signalize;

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

	const bind = (target: EventTarget, attributes: Record<string, any>): void => {
		for (const element of selectorToIterable(target, true) as HTMLElement[]) {
			const unwatchSignalCallbacks: CallableFunction[] = [];
			const elementScope = scope(element);

			for (let [attr, attrOptions] of Object.entries(attributes)) {
				if (attrOptions.length === 1) {
					attrOptions = attrOptions[0];
				}

				let getListener: CallableFunction | null = null;
				let setListener: CallableFunction | null = null;
				const attrOptionsAsArray = Array.isArray(attrOptions) ? attrOptions : [attrOptions];
				const isNumericInput = numericInputAttributes.includes(element.getAttribute('type') ?? '');
				const attributeBinder = attrOptionsAsArray.pop();
				const attributeBinderType = typeof attributeBinder;
				const attributeBinderIsFunction = attributeBinderType === 'function';
				const attributeBinderIsSignal = attributeBinder instanceof Signal;
				const signalsToWatch = attrOptionsAsArray;
				let attributeInited = false;
				let previousSettedValue: any;

				const setOption = async (attribute, value) => {
					value = value instanceof Promise ? await value : value;
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

						attributeInited = true;
					} else {
						element.setAttribute(attribute, value);
					}
				}

				if (['string', 'number'].includes(attributeBinderType)) {
					setOption(attr, attributeBinder);
					continue;
				}

				if (attributeBinderIsSignal === true) {
					signalsToWatch.push(attributeBinder);
				}

				if (attributeBinderIsSignal === true || signalsToWatch.length === 1) {
					getListener = () => attributeBinder();
					setListener = (value) => signalsToWatch[0].set(value);
				} else if (typeof attributeBinder === 'function') {
					getListener = () => attributeBinder();
				} else {
					getListener = typeof attributeBinder.get === 'function' ? () => attributeBinder.get() : null;
					setListener = typeof attributeBinder.set === 'function' ? (value) => attributeBinder.set(value) : null
				}

				if (attributeBinderIsFunction === true) {
					setOption(attr, attributeBinder());
				}

				for (const signalToWatch of signalsToWatch) {
					unwatchSignalCallbacks.push(
						signalToWatch.watch(async () => {
							setOption(attr, getListener());
						})
					);
				}

				if (typeof setListener === 'function' && reactiveInputAttributes.includes(attr)) {
					const inputListener = (): void => {
						setListener(isNumericInput ? Number(element[attr] as string) : element[attr] as string);
					};
					on('input', element, inputListener);

					if (elementScope instanceof Scope) {
						elementScope.cleanup(() => {
							off('input', element, inputListener);
						})
					}
				}
			}

			if (elementScope instanceof Scope) {
				elementScope.cleanup(() => {
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				})
			}
		}
	}

	signalize.bind = bind;
}
