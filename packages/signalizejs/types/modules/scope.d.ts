import type { Signalize } from '../../src/Signalize';

export interface ScopeConstrutorParams {
	node: Node
}

export type $cleanup = (data?: ScopeCleanupCallback) => void;

export type $data = Record<string, any>;

/** Interface representing a scope with essential properties and methods. */
export declare class Scope {
	constructor(config: ScopeConstrutorParams);
	/** Access to Signalize instance */
	$: Signalize;
	/** Root element associated with the scope */
	$el: Element;
	/** Optional parent scope (optional) */
	$parentScope?: Scope;
	/** Data associated with the scope */
	$data: Record<string, any>;
	/** Cleanup function initializer */
	$cleanup: $cleanup;
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

/** Function type to create a scope. */
export type scope = (
	node: SignalizeNode,
	init?: ScopeInitFunction
) => Scope | undefined;

export interface ScopeModule {
	scope: scope
}
