export interface SnippetOptions {
	snippetActions?: string[];
}

export interface RedrawSnippetOptions {
	snippets?: Record<string, SnippetOptions>;
	/** Enable/Disable View Transitions */
	transitionEnabled?: boolean;
}

/** Sync elements in dom with snippet="" with the new content- */
export type redrawSnippet = (content: string, options?: RedrawSnippetOptions) => Promise<void>;

export interface SnippetsModule {
	redrawSnippet: redrawSnippet
}
