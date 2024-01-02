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
			callback: async ({ scope, attribute }) => {
				const { $el } = scope;
				const nextSiblingScope = $.scope($el.nextSibling);
				let rendered = nextSiblingScope?.template === $el;
				let previousResult = rendered;
				let prerendered = true;
				let renderedNodes = [];

				if (rendered === false) {
					renderedNodes = $.getPrerenderedNodes($el);
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
						const getSignalsToWatch = $.observeSignals(scope);
						conditionResult = $.evaluate(attribute.value, scope);
						ifSignalsToWatch = getSignalsToWatch();
						inited = true;

						if (rendered) {
							return;
						}
					} else {
						conditionResult = await $.evaluate(attribute.value, scope);
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

					let fragment = $el.cloneNode(true).content;
					$.scope(fragment, (fragmentScope) => {
						fragmentScope.$data = scope.$parentScope.$data;
					});

					await $.processDirectives({ root: fragment });
					renderedNodes = [...fragment.childNodes];
					$el.after(fragment);
					rendered = true;
				}

				await render();

				const unwatchSignalCallbacks = [];

				while (ifSignalsToWatch.length) {
					unwatchSignalCallbacks.push(ifSignalsToWatch.shift().watch(render));
				}

				scope.$cleanup(() => {
					while (renderedNodes.length > 0) {
						renderedNodes.pop().remove()
					}
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				});
			}
		});
	}
}
