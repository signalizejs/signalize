import type { Signalize, SignalizePlugin } from '../..';

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.directive('bind', {
			matcher: ({ element, attribute }) => {
				if ([':for', ':if'].includes(attribute.name) && element.tagName.toLowerCase() === 'template') {
					return;
				}

				return new RegExp(`(?::|${$.attributePrefix}bind${$.attributeSeparator})(\\S+)|(\\{([^{}]+)\\})`)
			},
			callback: async ({ matches, element, data, attribute }) => {
				const isShorthand = attribute.name.startsWith('{');
				const attributeValue = isShorthand ? matches[3] : attribute.value;
				const attributeName = isShorthand ? matches[3] : matches[1];

				const fn = $.directiveFunction({
					functionString: `
						const result = ${attributeValue};
						return typeof result === 'function' ? result() : result;
					`,
					context: data,
					element
				});

				const getSignalsToWatch = $.observeSignals(data);

				await fn(data);

				$.bind(element, {
					[attributeName]: [...getSignalsToWatch(), () => fn(data)]
				});
			}
		});
	}
}
