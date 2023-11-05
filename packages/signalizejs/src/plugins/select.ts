import type Signalize from '..';

declare module '..' {
	interface Signalize {
		selectorToIterable: (target: Selectable, normalizeDocument?: boolean) => IterableElements
		select: <T extends HTMLElement>(selector: string, root?: string | HTMLElement) => T | null
		selectAll: <T extends HTMLElement>(selector: string, root?: string | HTMLElement) => NodeListOf<T>
	}
}

export type Selectable = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement | Window | Document

export type IterableElements = Array<HTMLElement | Document | Window>

export default ($: Signalize): void => {
	$.select = <T extends HTMLElement>(selector: string, root?: string | HTMLElement): T | null => {
		root = root ?? $.config.root
		if (typeof root === 'string') {
			const rootSelector = root;
			root = root.querySelector(rootSelector) as HTMLElement;

			if (root === null) {
				throw new Error(`Signalize: Root element "${rootSelector}" not found.`);
			}
		}

		return root.querySelector(selector);
	}

	$.selectAll = <T extends HTMLElement>(selector: string, root?: string | HTMLElement): NodeListOf<T> => {
		root = root ?? $.config.root;
		if (typeof root === 'string') {
			const rootSelector = root;
			root = root.querySelector(rootSelector) as HTMLElement;

			if (root === null) {
				throw new Error(`Signalize: Root element "${rootSelector}" not found.`);
			}
		}

		return root.querySelectorAll(selector);
	}

	$.selectorToIterable = (target: Selectable, normalizeDocument = false): IterableElements => {
		let elements: IterableElements;

		if (typeof target === 'string') {
			elements = [...$.selectAll<HTMLElement>(target)];
		} else {
			const targetIsDocument = target instanceof Document;
			if (target instanceof HTMLElement || targetIsDocument || target instanceof Window) {
				elements = [targetIsDocument && normalizeDocument ? target.documentElement : target]
			} else {
				elements = target instanceof Array || target instanceof NodeList ? [...target] : [target];
			}
		}

		return elements.filter((element) => element !== null);
	}
}
