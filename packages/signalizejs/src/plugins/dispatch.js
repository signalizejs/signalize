/* declare module '..' {
	interface Signalize {
		customEvent: (eventName: string, eventData?: any, options?: Options) => CustomEvent
		dispatch: (eventName: string, eventData?: any, options?: Options) => boolean
	}
} */

/**
 * Options for configuring an event, including the target, bubbles, and cancelable properties.
 *
 * @interface Options
 * @property {Document | Element | DocumentFragment} [target] - The target document, element, or document fragment (optional).
 * @property {boolean} [bubbles] - Indicates whether the event bubbles up through the DOM hierarchy (optional).
 * @property {boolean} [cancelable] - Indicates whether the event can be canceled (optional).
 */


/**
 * @param {import('../Signalize').Signalize} $
 * @returns {void}
 */
export default ($) => {
	/**
	 * Creates a custom event with the specified name, data, and options.
	 *
	 * @function
	 * @param {string} eventName - The name of the custom event.
	 * @param {*} [eventData] - Optional data to associate with the custom event.
	 * @param {Options} [options] - Options for configuring the custom event.
	 * @returns {CustomEvent} A newly created custom event.
	 */
	$.customEvent = (eventName, eventData, options) => new window.CustomEvent(eventName, {
		detail: eventData,
		cancelable: options?.cancelable ?? false,
		bubbles: options?.bubbles ?? false
	});

	/**
	 * Dispatches a custom event with the specified name, data, and options.
	 *
	 * @function
	 * @param {string} eventName - The name of the custom event to dispatch.
	 * @param {*} [eventData] - Optional data to associate with the custom event.
	 * @param {Options} [options] - Options for configuring the dispatch of the custom event.
	 * @returns {boolean} Indicates whether the event dispatch was successful.
	 */
	$.dispatch = (eventName, eventData, options) => (options?.target ?? $.root).dispatchEvent(
		$.customEvent(eventName, eventData, options)
	);
};
