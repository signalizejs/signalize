import type Signalize from '..';

declare module '..' {
	interface Signalize {
		ref: <T extends HTMLElement>(id: string, root?: HTMLElement) => T | null
		refs: <T extends HTMLElement>(id: string, root?: HTMLElement) => T[]
	}
}

export default (signalize: Signalize): void => {
	const { config, selectAll } = signalize;
	const refAttribute = `${config.attributesPrefix}ref`;

	const refs = <T extends HTMLElement>(id: string, root: HTMLElement = document.documentElement): T[] => {
		return [...selectAll<T>(`[${config.attributesPrefix}${refAttribute}="${id}"]`, root)]
	};

	signalize.refs = refs;
	signalize.ref = <T extends HTMLElement>(id: string, root: HTMLElement = document.documentElement): T | null => {
		return refs<T>(id, root)[0] ?? null;
	}
}
