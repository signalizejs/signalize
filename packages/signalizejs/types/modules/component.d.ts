/** Life cycle listener function type. */
export type LifeCycleListener = () => void;

/* Array of life cycle listeners. */
export type LifeCycleListeners = LifeCycleListener[];

/** Function type for connecting to life cycle events. */
export type setupCallbackLifeCycleConnector = (listener: LifeCycleListener) => void;

/** Setup callback parameters interface. */
export interface SetupCallbackParams {
	/** Connect to connected life cycle */
	$connected: setupCallbackLifeCycleConnector;
	/** Connect to disconnected life cycle */
	$disconnected: setupCallbackLifeCycleConnector;
	/** Connect to adopted life cycle */
	$adopted: setupCallbackLifeCycleConnector;
}

/** Component props function type. */
export type ComponentProps = () => Record<string, any>;

/** Component setup function. */
export type setupCallback = (data: SetupCallbackParams) => void | Promise<void>;

/** Component configuration options interface */
export interface ComponentOptions {
	/** Component props definition. */
	props?: Record<string, any> | string[] | ComponentProps;
	/** Function for defining component logic. */
	setup?: setupCallback;
	/**
	 * Use shadow root.
	 * https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
	*/
	shadow?: ShadowRootInit;
}

/** Creates a custom Web Component with the specified name and options. */
export type component = (name: string, optionsOrSetup?: ComponentOptions | setupCallback) => typeof HTMLElement;
