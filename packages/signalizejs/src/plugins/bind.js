/* declare module '..' {
	interface Signalize {
		bind: (target: EventTarget, attributes: Record<string, any>) => void
	}
} */

/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default ($) => {
	const { on, Signal } = $;

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
	};

	$.bind = (element, attributes) => {
		/** @type {CallableFunction[]} */
		const unwatchSignalCallbacks = [];
		const cleanups = [];

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
			let previousSettedValue;
			let previousValue;

			/**
			 * @param {string} attribute
			 * @param {string|number} value
			 * @returns {Promise<void>}
			 */
			const setAttribute = async (attribute, value) => {
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
						if (previousSettedValue !== undefined) {
							for (const className of previousSettedValue) {
								element.classList.remove(className);
							}
						}
					}

					const valueToSet = value.trim().split(' ').filter((className) => className.trim().length > 0);
					previousSettedValue = valueToSet;

					for (const className of valueToSet) {
						element.classList.add(className);
					}
				} else {
					element.setAttribute(attribute, value);
				}
				attributeInited = true;
			};

			if (['string', 'number'].includes(attributeBinderType)) {
				setAttribute(attr, attributeBinder);
				continue;
			}

			if (attributeBinderIsSignal) {
				signalsToWatch.push(attributeBinder);
			}

			/** @type {CallableFunction|null} */
			let getListener = null;
			/** @type {CallableFunction|null} */
			let setListener = null;
			/** @type {any} */
			let initValue = undefined;
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

				if (typeof attributeBinder?.value !== 'undefined') {
					initValue = attributeBinder?.value;
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

			if (getListener !== null || initValue !== undefined) {
				setAttribute(attr, initValue !== undefined ? initValue : getListener());
			}

			for (const signalToWatch of signalsToWatch) {
				unwatchSignalCallbacks.push(
					signalToWatch.watch(() => setAttribute(attr, getListener()))
				);
			}

			if (typeof setListener === 'function' && reactiveInputAttributes.includes(attr)) {
				const inputListener = () => {
					setListener(isNumericInput ? Number(element[attr].replace(',', '.')) : element[attr]);
				};

				on('input', element, inputListener, { passive: true });
				cleanups.push(() => $.off('input', element, inputListener));
			}
		}

		$.scope(element, ({ $cleanup }) => {
			$cleanup(() => {
				for (const cleanup of cleanups) {
					cleanup();
				}

				for (const unwatch of unwatchSignalCallbacks) {
					unwatch();
				}
			});
		});
	};
};
