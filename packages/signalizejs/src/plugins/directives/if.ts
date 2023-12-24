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
			callback: async ({ vnode, attribute }) => {
				const { $el } = vnode;
				let nextSibling = $el.nextSibling;
				const nextSiblingVnode = $.vnode(nextSibling);
				let rendered = nextSiblingVnode?.template === $el;
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
						const getSignalsToWatch = $.observeSignals(vnode);
						conditionResult = $.evaluate(attribute.value, vnode);
						ifSignalsToWatch = getSignalsToWatch();
						inited = true;

						if (rendered) {
							return;
						}
					} else {
						conditionResult = await $.evaluate(attribute.value, vnode);
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
					$.vnode(fragment, (fragmentVnode) => {
						fragmentVnode.$data = vnode.$parentVnode.$data;
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

				vnode.$cleanup(() => {
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
