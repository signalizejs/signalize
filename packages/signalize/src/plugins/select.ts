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

export default (signalize: Signalize): void => {
	const { config } = signalize;

	signalize.selectorToIterable = (target: Selectable, normalizeDocument = false): IterableElements => {
		let elements: IterableElements;

		if (typeof target === 'string') {
			elements = [...signalize.selectAll<HTMLElement>(target)];
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

	signalize.select = <T extends HTMLElement>(selector: string, root: string | HTMLElement = config.root): T | null => {
		if (typeof root === 'string') {
			const rootSelector = root;
			root = config.root.querySelector(rootSelector) as HTMLElement;

			if (root === null) {
				throw new Error(`Signalize: Root element "${rootSelector}" not found.`);
			}
		}

		return root.querySelector(selector);
	}

	signalize.selectAll = <T extends HTMLElement>(selector: string, root: string | HTMLElement = config.root): NodeListOf<T> => {
		if (typeof root === 'string') {
			const rootSelector = root;
			root = config.root.querySelector(rootSelector) as HTMLElement;

			if (root === null) {
				throw new Error(`Signalize: Root element "${rootSelector}" not found.`);
			}
		}

		return root.querySelectorAll(selector);
	}
}
