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
		for (const [attr, attrOptions] of Object.entries(attributes)) {
			const optionsIsArray = attrOptions instanceof Array;
			let getListener: CallableFunction | null = null;
			let setListener: CallableFunction | null = null;
			let attrOptionsAsArray = [attrOptions];
			const isNumericInput = numericInputAttributes.includes(element.getAttribute('type') ?? '');
			let listeners = null;

			if (optionsIsArray) {
				listeners = attrOptions[attrOptions.length - 1];
				attrOptionsAsArray = attrOptions.slice(0, attrOptions.length - 1);
			} else if (typeof attrOptions === 'function') {
				listeners = attrOptions;
			}

			if (typeof listeners === 'function') {
				getListener = listeners;
				setListener = listeners.set;
			} else {
				getListener = typeof listeners.get === 'function' ? () => listeners.get() : null;
				setListener = typeof listeners.set === 'function' ? (value) => listeners.set(value) : null
			}

			for (const attrOption of attrOptionsAsArray) {
				let attributeInited = false;
				let attributeInitValue = undefined;
				let previousSettedValue = undefined;

				const setOption = (attribute, value) => {
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

				if (['string', 'number'].includes(typeof attrOption)) {
					setOption(attr, attrOption);
					continue;
				}

				attrOption.watch((data) => {
					const content = getListener !== null ? getListener({ el: element }) : data.newValue;
					setOption(attr, content)
				}, { immediate: true });
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
