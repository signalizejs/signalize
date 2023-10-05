import type Signalize from '..';

export type RefRootElement = HTMLElement | Document | DocumentFragment

declare module '..' {
	interface Signalize {
		ref: <T extends HTMLElement>(id: string, root?: RefRootElement) => T | null
		refs: <T extends HTMLElement>(id: string, root?: RefRootElement) => T[]
	}
}

export default (signalize: Signalize): void => {
	const { config, selectAll } = signalize;
	const refAttribute = `${config.attributesPrefix}ref`;

	const refs = <T extends HTMLElement>(id: string, root: RefRootElement = document.documentElement): T[] => {
		return selectAll<T>(`[${refAttribute}="${id}"]`, root)
	};

	signalize.refs = refs;
	signalize.ref = <T extends HTMLElement>(id: string, root: RefRootElement = document.documentElement): T | null => {
		return refs<T>(id, root)[0] ?? null;
	}
}
