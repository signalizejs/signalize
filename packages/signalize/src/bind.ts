import { normalizeTargets } from '.';

const reactiveInputAttributes = ['value', 'checked'];
const numericInputAttributes = ['range', 'number'];
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

export const bind = (target: EventTarget, attributes: Record<string, any>): void => {
	for (const element of normalizeTargets(target, true) as HTMLElement[]) {
		for (const [attr, attrOptions] of Object.entries(attributes)) {
			const optionsIsArray = attrOptions instanceof Array;
			let listener: CallableFunction | null = null;
			let attrOptionsAsArray = [attrOptions];

			if (optionsIsArray) {
				listener = attrOptions[attrOptions.length - 1];
				attrOptionsAsArray = attrOptions.slice(0, attrOptions.length - 1);
			} else if (typeof attrOptions === 'function') {
				listener = attrOptions;
			}

			for (const attrOption of attrOptionsAsArray) {
				if (['string', 'number'].includes(typeof attrOption)) {
					element.setAttribute(attr, attrOption);
					continue;
				}
				attrOption.watch((data: any) => {
					const content = (listener != null) ? listener({ el: element }) : data.newValue;
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
			}

			if (reactiveInputAttributes.includes(attr)) {
				const isNumericInput = numericInputAttributes.includes(element.getAttribute('type') ?? '');
				element.addEventListener('input', () => {
					let newValue = element[attr];
					if (isNumericInput) {
						newValue = Number(newValue)
					}
					attrOptionsAsArray[0].set(newValue);
				});
			}
		}
	}
}
