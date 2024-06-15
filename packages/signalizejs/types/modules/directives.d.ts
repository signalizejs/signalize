import type { Scope } from "./scope";

/** Callback function type for a directive */
export type DirectiveCallback = (data: DirectiveCallbackData) => Promise<void> | void;

/** Data passed to a directive callback */
export interface DirectiveCallbackData {
	scope: Scope;
	/** Result of matching a regular expression */
	matches: RegExpMatchArray;
	/** Attribute associated with the directive */
	attribute: Attr;
}

/** Parameters for a directive matcher */
export interface DirectiveMatcherParameters {
	/** Element associated with the directive */
	element: Element;
	/** Attribute associated with the directive */
	attribute: Attr;
}

/** Return type of a directive matcher */
export type DirectiveMatcherReturn = RegExp | undefined;

/** Directive matcher function type */
export type DirectiveMatcher = (params: DirectiveMatcherParameters) => DirectiveMatcherReturn;

/** Options for processing an HTML element */
export interface ProcessElementOptions {
	/** Element to be processed */
	element: Element;
}

/** Directive definition with matcher and callback */
export interface Directive {
	/** Optional matcher for the directive */
	matcher?: RegExp | DirectiveMatcher;
	/** Callback function for the directive */
	callback: DirectiveCallback;
}

/** Registered directive with enforced matcher function type */
export interface RegisteredDirective extends Directive {
	/** Matcher function for the directive (enforced) */
	matcher?: DirectiveMatcher;
}

/** Options for processing directives within a DOM tree */
export interface ProcessDirectiveOptions {
	/** Root element of the DOM tree to process */
	root: Element;
	/** Optional array of directive names to process */
	directives?: string[];
	/** Optional array of directive names to process */
	onlyRoot?: boolean;
}

/** Options for configuring a directive-related plugin */
export interface PluginOptions {
	/** Optional start marker for prerendered blocks */
	prerenderedBlockStart?: string;
	/** Optional end marker for prerendered blocks */
	prerenderedBlockEnd?: string;
}

/** Asynchronously processes directives within a DOM tree based on the specified options. */
export type processDirectives = (options?: ProcessDirectiveOptions) => Promise<void>;

/** Defines a custom directive with the specified name, matcher, and callback. */
export type directive = (name: string, options: Omit<Directive, 'matcher'> & { matcher?: DirectiveMatcher }) => void;

/** Retrieves prerendered nodes from the specified HTML element. */
export type getPrerenderedNodes = (element: Element) => Node[];

export interface DirectivesModule {
	getPrerenderedNodes: getPrerenderedNodes;
	processDirectives: processDirectives;
	directive: directive;
}

export interface DirectivesModuleConfig {
	prerenderedBlockStart?: string;
	prerenderedBlockEnd?: string;
}
