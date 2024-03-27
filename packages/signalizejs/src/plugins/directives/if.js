/**
 * @param {Pluginoptions} [options]
 * @returns {import('../../Signalize').SignalizePlugin}
 */
export default () => {
	/**
	 * @param {import('../../Signalize').Signalize} $
	 * @returns {void}
	 */
	return ($) => {
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

				/**
				 * @returns {Promise<void>}
				 */
				const render = async () => {
					let { result, signalsToWatch } = $.evaluate(attribute.value, scope, !inited);
					result = typeof result === 'function' ? result() : result;

					if (!inited) {
						ifSignalsToWatch = signalsToWatch;
						inited = true;

						if (rendered) {
							return;
						}
					}

					if (result === previousResult) {
						return;
					}

					previousResult = result;

					if (result !== true || prerendered) {
						while (renderedNodes.length > 0) {
							renderedNodes.pop().remove();
						}
					}

					if (result !== true) {
						rendered = false;
						return;
					}

					let fragment = $el.cloneNode(true).content;
					$.scope(fragment, (fragmentScope) => {
						fragmentScope.$data = {...fragmentScope.$data, ...scope.$data};
					});

					await $.processDirectives({ root: fragment });
					renderedNodes = [...fragment.childNodes];
					$el.after(fragment);
					rendered = true;
				};

				await render();

				const unwatchSignalCallbacks = [];

				while (ifSignalsToWatch.length) {
					unwatchSignalCallbacks.push(ifSignalsToWatch.shift().watch(render));
				}

				scope.$cleanup(() => {
					while (renderedNodes.length > 0) {
						renderedNodes.pop().remove();
					}
					for (const unwatch of unwatchSignalCallbacks) {
						unwatch();
					}
				});
			}
		});
	};
};
