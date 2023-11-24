import type { Signalize, SignalizePlugin } from '../..';

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.directive('on', {
			matcher: new RegExp(`(?:\\@|${$.attributePrefix}on${$.attributeSeparator})(\\S+)`),
			callback: async (scope) => {
				const { matches, element, data, attribute } = scope;

				$.on(matches[1], element, async (event) => {
					const context = {
						$event: event,
						$element: element,
						...data
					}
					const fn = $.directiveFunction({
						functionString: `
							const result = ${attribute.value};
							typeof result === 'function' ? result($event) : result;
						`,
						context,
						element
					});

					const result = await fn(context);

					if (typeof result === 'function') {
						result(event);
					}
				});
			}
		});
	}
}
