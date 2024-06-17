export interface EventModule {
	on: on;
	off: off;
	customEventListener: customEventListener;
	customEvent: customEvent;
	dispatch: dispatch;
}

/** Event target types */
export type CustomEventTarget = string | NodeListOf<Element> | Element[] | Element | Window;

/** Custom event listener configuration */
export interface CustomEventListenerConfig {
	/** Method to add an event listener. */
	on: CustomEventListenerOnHandler;
	/** Method to remove an event listener. */
	off?: (args: CustomEventListenerArgs) => void;
	/** Method for dispatching global event. */
	dispatch?: (args: CustomEvent) => void;
}

/** Custom event listener on handler type */
export type CustomEventListenerOnHandler = (args: CustomEventListenerArgs) => void;

/** Custom event listener arguments */
export interface CustomEventListenerArgs {
	target: Element;
	listener: CallableFunction;
	options: AddEventListenerOptions;
	event: string;
}

/** Custom event listener type (extends for specific events) */
export interface CustomEventListener extends EventListener { }

export interface CustomEventListeners extends HTMLElementEventMap {
	clickOutside: CustomEventListener;
	remove: CustomEventListener;
}

/** Dispatch function type */
export type dispatch = (eventName: string, eventData?: any, options?: Record<string, any>) => boolean;

/** Custom event creation function type */
export type customEvent = (eventName: string, eventData?: any, options?: CustomEventInit) => CustomEvent;

/** Custom event listener creation function type */
export type customEventListener = (eventName: string, configOrHandler: CustomEventListenerConfig | CustomEventListenerOnHandler) => void;

/** Plugin options type */
export interface EventConfig {
	customEventListeners: Record<string, CustomEventListener>;
}

/**
 * Add event listener to an element or for a custom event.
 * This method returns a prepared off listener.
*/
export type on = (events: keyof CustomEventListeners, targetOrCallback: CustomEventTarget | CallableFunction, callbackOrOptions?: CallableFunction | AddEventListenerOptions, options?: AddEventListenerOptions) => CallableFunction;

/**
 * Remove event listener from elements or from custom event.
 */
export type off = (events: Extract<keyof CustomEventListeners, element: Element|Document, listener: CallableFunction, options: EventListenerOptions) => void;
