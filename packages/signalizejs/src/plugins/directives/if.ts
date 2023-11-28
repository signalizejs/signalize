import type { Signalize, SignalizePlugin } from '../..';

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.directive('if', {
			matcher: ({ element }) => {
				if (element.tagName.toLowerCase() !== 'template') {
					return;
				}

				return new RegExp(`(?::|${$.attributePrefix})if`);
			},
			callback: async ({ element, data, attribute }) => {
				const fnSharedPart = `
					let __result = ${attribute.value};
					__result = typeof __result === 'function' ? await __result() : __result;
				`

				let nextSibling = element.nextSibling;
				const nextSiblingScope = $.scope(nextSibling);
				let rendered = nextSiblingScope?.template === element;
				let previousResult = rendered;
				let prerendered = true;
				let renderedNodes = [];

				if (rendered === false) {
					renderedNodes = $.getPrerenderedNodes(element);
					if (renderedNodes.length) {
						rendered = true;
						prerendered = true;
					}
				}
				let inited = false;
				let ifSignalsToWatch = [];

				const render = async (): Promise<void> => {
					let conditionResult;
					if (!inited) {
						const { result, signalsToWatch } = await $.directiveFunction({
							functionString: `
								const __getSignalsToWatch = $.observeSignals($context);
								${fnSharedPart}
								return { result: __result, signalsToWatch: __getSignalsToWatch() }
							`,
							context: data,
							element
						})(data);
						conditionResult = result;
						ifSignalsToWatch = signalsToWatch;
						inited = true;

						if (rendered) {
							return;
						}
					} else {
						conditionResult = await $.directiveFunction({
							functionString: `
								${fnSharedPart}
								return __result;
							`,
							context: data,
							element
						})(data);
					}

					if (conditionResult === previousResult) {
						return;
					}

					previousResult = conditionResult;

					if (conditionResult !== true || prerendered) {
						while (renderedNodes.length > 0) {
							renderedNodes.pop().remove()
						}
					}

					if (conditionResult !== true) {
						rendered = false;
						return;
					}

					let fragment = element.cloneNode(true).content;
					const dataForFragment = data;
					$.scope(fragment, ({ data }) => {
						for (const [key, value] of Object.entries(dataForFragment)) {
							data[key] = value;
						}
					});

					await $.processDirectives({ root: fragment });
					renderedNodes = [...fragment.childNodes];
					element.after(fragment);
					rendered = true;
				}

				await render();

				const unwatchSignalCallbacks = [];

				while (ifSignalsToWatch.length) {
					unwatchSignalCallbacks.push(ifSignalsToWatch.shift().watch(render));
				}

				$.scope(element).cleanup(() => {
					while (renderedNodes.length > 0) {
						renderedNodes.pop().remove()
					}
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				})
			}
		});
	}
}
