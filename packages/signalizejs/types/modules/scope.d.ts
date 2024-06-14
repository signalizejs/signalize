/** Interface representing a scope with essential properties and methods. */
export interface Scope {
	/** Access to Signalize instance */
	$: import('../Signalize').Signalize;
	/** Root element associated with the scope */
	$el: Element;
	/** Optional parent scope (optional) */
	$parentScope?: Scope;
	/** Data associated with the scope */
	$data: Record<string, any>;
	/** Cleanup function initializer */
	$cleanup: ScopeCleanupCallbackInitializer;
	/** References to elements within the scope */
	$refs: Record<string, Element | Element[]>;
}

/** Interface extending Node with a private property */
export interface SignalizeNode extends Node {
	/** Internal reference to the scope (optional) */
	__signalizeScope?: Scope;
}

/** Type representing a function that initializes a scope. */
export type ScopeInitFunction = (scope: Scope) => void;

/** Type representing a function for scope cleanup. */
export type ScopeCleanupCallback = () => void | Promise<void>;

/** Function type for initializing a scope cleanup callback. */
export type ScopeCleanupCallbackInitializer = (data?: ScopeCleanupCallback) => void;

/** Function type to create a scope. */
export type ScopeCallback = (
	node: SignalizeNode,
	init?: ScopeInitFunction
) => Scope | undefined;
