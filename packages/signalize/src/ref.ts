import { $config } from './config';
import { onDomReady } from './domReady';
import { selectAll } from './select';

let refAttribute = 'ref';

export const refs = <T extends HTMLElement>(id: string, root: HTMLElement = document.documentElement): T[] => {
	return [...selectAll<T>(`[${$config.attributePrefix}${refAttribute}="${id}"]`, root)]
}

export const ref = <T extends HTMLElement>(id: string, root: HTMLElement = document.documentElement): T | null => {
	return refs<T>(id, root)[0] ?? null;
}

onDomReady(() => {
	refAttribute = `${$config.attributePrefix}${refAttribute}`
});
