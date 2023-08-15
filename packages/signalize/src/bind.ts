import { normalizeTargets } from './normalizeTargets';

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

export const bind = (target: EventTarget, attributes: Record<string, any>): void => {

	for (const element of normalizeTargets(target, true) as HTMLElement[]) {
		for (let [attr, attrOptions] of Object.entries(attributes)) {
			if (attrOptions.length === 1) {
				attrOptions = attrOptions[0];
			}

			let getListener: CallableFunction | null = null;
			let setListener: CallableFunction | null = null;
			let attrOptionsAsArray = Array.isArray(attrOptions) ? attrOptions : [attrOptions];
			const isNumericInput = numericInputAttributes.includes(element.getAttribute('type') ?? '');
			let attributeBinder = attrOptionsAsArray.pop();
			const attributeBinderType = typeof attributeBinder;
			const attributeBinderIsFunction = attributeBinderType === 'function';
			const attributeBinderIsSignal = attributeBinderIsFunction && attributeBinder.name.includes('signal');
			let signalsToWatch = attrOptionsAsArray;
			let attributeInited = false;
			let attributeInitValue = undefined;
			let previousSettedValue = undefined;

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
					} else {
						attributeInitValue = element.getAttribute('class');
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
				getListener = attributeBinder;
				setListener = attributeBinder.set;
			} else if (signalsToWatch.length === 1) {
				getListener = attributeBinder;
				setListener = signalsToWatch[0].set;
			} else {
				getListener = typeof attributeBinder.get === 'function' ? () => attributeBinder.get() : null;
				setListener = typeof attributeBinder.set === 'function' ? (value) => attributeBinder.set(value) : null
			}

			if (attributeBinderIsFunction === true) {
				setOption(attr, attributeBinder());
			}

			for (const signalToWatch of signalsToWatch) {
				signalToWatch.watch((data) => {
					setOption(attr, getListener());
				});
			}

			if (typeof setListener === 'function' && reactiveInputAttributes.includes(attr)) {
				element.addEventListener('input', () => {
					const newValue = element[attr] as string;
					setListener(isNumericInput ? Number(newValue) : newValue);
				});
			}
		}
	}
}
