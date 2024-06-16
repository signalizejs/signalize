import type  { Signalize as SignalizeInstance } from "../src/Signalize";

export type Globals = Record<string, any>;

export type Params = Record<string, any>;

export type Modules = Array<string|[string, Record<string, any>]|[string, Function]|[string, Function, Record<string, any>]>;

/** Module resolver definition */
export type ModulesResolver = <T>(moduleName: string) => Promise<T>

export type Module<F=Record<string, any>, C=Record<string, any>|undefined> = (signalize: Signalize, config: C) => F|Promise<F>;

export type ModulesToResolve = Array<string|[string, Record<string, any>|Function, Record<string, any>|undefined]|Record<string, any>>;

export type InitedCallback = CallableFunction;

export interface Root extends Node {
	__signalize: SignalizeInstance
}

/**
 * Resolve functionality from modules.
*/
export type Resolve<T> = (...modules: ModulesToResolve) => Promise<T>;

export interface SignalizeConfig {
	/** The root element or document where Signalize will be instantiated. */
	root?: Root;
	/** Parameters that can be accessed by modules within Signalize */
	params?: Params
	/** Global variables used inside modules functions.
	 * This object can also be used to prevent polution of the window object.
	 */
	globals?: Globals;
	/** Modules that will be inited instantly. */
	modules?: Modules;
	/** The id of the Signalize instance for imports to prevent collisions. */
	instanceId?: string;
	/** Asynchronous Modules resolver. */
	resolver?: ModulesResolver;
}

export declare class Signalize {
	constructor(options: SignalizeConfig);
	root: Root;
	globals: Globals;
	params: Params;
	inited: (callback: InitedCallback) => Promise<void>;
	resolve: Resolve;
}
