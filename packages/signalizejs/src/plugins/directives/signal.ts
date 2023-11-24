import type { Signalize, SignalizePlugin } from '../..';

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.directive('signal', {
			matcher: new RegExp(`(?:\\$|${$.attributePrefix}signal${$.attributeSeparator})(\\S+)`),
			callback: async ({ matches, element, data, attribute }): Promise<void> => {
				const fn = $.directiveFunction({
					functionString: `
						const result = ${attribute.value.length ? attribute.value : "''"};
						return result instanceof $.Signal ? result() : result;
					`,
					context: data,
					element
				});

				const newSignal = $.signal();

				const setSignal = async () => {
					let result = await fn(data);

					if (typeof result === 'string' && result.length > 0 && !isNaN(result)) {
						result = parseFloat(result);
					}

					newSignal.value = result;
				}

				let unwatchSignalCallbacks = [];
				const getSignalsToWatch = $.observeSignals(data);

				await setSignal();

				unwatchSignalCallbacks = [];

				for (const signalToWatch of getSignalsToWatch()) {
					unwatchSignalCallbacks.push(signalToWatch.watch(setSignal))
				}

				$.scope(element, ({ data, cleanup }) => {
					data[matches[1]] = newSignal;
					cleanup(() => {
						while (unwatchSignalCallbacks.length > 0) {
							unwatchSignalCallbacks.shift()()
						}
					})
				})
			}
		});
	}
}
