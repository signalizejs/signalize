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
				const fn = $.directiveFunction({
					functionString: `
						const result = ${attribute.value};
						return typeof result === 'function' ? result() : result;
					`,
					context: data,
					element
				});

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
				let signalsToWatch;
				let getSignalsToWatch = null;

				const render = async (): Promise<void> => {
					if (!inited) {
						getSignalsToWatch = $.observeSignals(data);
					}
					const conditionResult = await fn(data);

					if (!inited) {
						signalsToWatch = getSignalsToWatch();
						inited = true;

						if (rendered) {
							return;
						}
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

				while (signalsToWatch.length) {
					unwatchSignalCallbacks.push(signalsToWatch.shift().watch(render));
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
