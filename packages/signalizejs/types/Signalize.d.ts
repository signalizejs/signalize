import { Signalize as SignalizeInstance } from "../src/Signalize";
import { AjaxModule } from "./modules/ajax";
import { BindModule } from "./modules/bind";
import { ComponentModule } from "./modules/component";
import { DialogModule } from "./modules/dialog";
import { DirectivesModule } from "./modules/directives";
import { DomReadyModule } from "./modules/dom/ready";
import { DomTraverserDomModule } from "./modules/dom/traverser";
import { EvaluatorModule } from "./modules/evaluator";
import { EventModule } from "./modules/event";
import { HyperscriptModule } from "./modules/hyperscript";
import { IntersectionObserverModule } from "./modules/intersection-observer";
import { MutationObserverModule } from "./modules/mutation-observer";
import { OffsetModule } from "./modules/offset";
import { ScopeModule } from "./modules/scope";
import { SignalModule } from "./modules/signal";
import { SizesModule } from "./modules/sizes";
import { SnippetsModule } from "./modules/snippets";
import { SpaModule } from "./modules/spa";
import { StringsCasesModule } from "./modules/strings/cases";
import { TaskModule } from "./modules/task";
import { ViewportModule } from "./modules/viewport";
import { VisibilityModule } from "./modules/visibility";

export type Globals = Record<string, any>;

export type Params = Record<string, any>;

export type Modules = Array<string | [string, Record<string, any>] | [string, Function] | [string, Function, Record<string, any>]>;

/** Module resolver definition */
export type ModulesResolver = <T>(moduleName: string) => Promise<T>

export type Module<F = Record<string, any>, C = Record<string, any> | undefined> = (signalize: Signalize, config: C) => F | Promise<F>;

export type ModulesToResolve = Array<string | [string, Record<string, any> | Function, Record<string, any> | undefined] | Record<string, any>>;

export type InitedCallback = CallableFunction;

export interface Root extends Node {
	__signalize: SignalizeInstance
}

/**
 * Resolve functionality from modules.
*/
export type Resolve = <T = ResolvableFunctionality>(...modules: ModulesToResolve) => Promise<T>;

export interface ResolvableFunctionality extends
	AjaxModule,
	BindModule,
	ComponentModule,
	DialogModule,
	DirectivesModule,
	DomReadyModule,
	DomTraverserDomModule,
	EvaluatorModule,
	EventModule,
	HyperscriptModule,
	IntersectionObserverModule,
	MutationObserverModule,
	OffsetModule,
	ScopeModule,
	SignalModule,
	SizesModule,
	SnippetsModule,
	SpaModule,
	StringsCasesModule,
	TaskModule,
	ViewportModule,
	VisibilityModule { }

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
