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
			callback: async ({ node, context, attribute }) => {
				let nextSibling = node.nextSibling;
				const nextSiblingVnode = $.vnode(nextSibling);
				let rendered = nextSiblingVnode?.template === node;
				let previousResult = rendered;
				let prerendered = true;
				let renderedNodes = [];

				if (rendered === false) {
					renderedNodes = $.getPrerenderedNodes(node);
					if (renderedNodes.length) {
						rendered = true;
						prerendered = true;
					}
				}
				let inited = false;
				let ifSignalsToWatch = [];

				const processValue = async (value) => {
					return typeof value === 'function' ? value.call(context) : value;
				}

				const render = async (): Promise<void> => {
					let conditionResult;
					if (!inited) {
						const getSignalsToWatch = $.observeSignals(context);
						conditionResult = $.evaluate(attribute.value, context);
						ifSignalsToWatch = getSignalsToWatch();
						inited = true;

						if (rendered) {
							return;
						}
					} else {
						conditionResult = await $.evaluate(attribute.value, context);
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

					let fragment = node.cloneNode(true).content;
					$.vnode(fragment, (elVnode) => {
						elVnode.context = context;
					});
					await $.processDirectives({ root: fragment });
					renderedNodes = [...fragment.childNodes];
					node.after(fragment);
					rendered = true;
				}

				await render();

				const unwatchSignalCallbacks = [];

				while (ifSignalsToWatch.length) {
					unwatchSignalCallbacks.push(ifSignalsToWatch.shift().watch(render));
				}

				$.vnode(node).cleanup(() => {
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
