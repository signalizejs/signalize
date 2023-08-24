import type Signalize from "..";

let refAttribute = 'ref';

export default (signalize: Signalize): void => {
	const { config, selectAll } = signalize;
	const refs = <T extends HTMLElement>(id: string, root: HTMLElement = document.documentElement): T[] => {
		return [...selectAll<T>(`[${config.attributesPrefix}${refAttribute}="${id}"]`, root)]
	};

	signalize.refs = refs;
	signalize.ref = <T extends HTMLElement>(id: string, root: HTMLElement = document.documentElement): T | null => {
		return refs<T>(id, root)[0] ?? null;
	}
}
