import type Signalize from '..';

declare module '..' {
	interface Signalize {
		selectorToIterable: (target: Selectable, normalizeDocument?: boolean) => IterableElements
		select: <T extends Element>(selector: string, root?: string | Element) => T | null
		selectAll: <T extends Element>(selector: string, root?: string | Element) => NodeListOf<T>
	}
}

export type Selectable = string | NodeListOf<Element> | Element[] | Element | Window | Document

export type IterableElements = Array<Element | Document | Window>

export default ($: Signalize): void => {
	$.select = <T extends Element>(selector: string, root: string | Element | Document = $.root): T | null => {
		const rootEl = typeof root === 'string' ? $.root.querySelector(root) : root;

		if (rootEl === null) {
			throw new Error('Signalize: root for select cannot be null.');
		}

		return rootEl.querySelector(selector);
	}

	$.selectAll = <T extends Element>(selector: string, root: string | Element | Document = $.root): NodeListOf<T> => {
		const rootEl = typeof root === 'string' ? $.root.querySelector(root) : root;

		if (rootEl === null) {
			throw new Error('Signalize: root for selectAll cannot be null.');
		}

		return rootEl.querySelectorAll(selector);
	}

	$.selectorToIterable = (target: Selectable, normalizeDocument = false): IterableElements => {
		let elements: IterableElements;

		if (typeof target === 'string') {
			elements = [...$.selectAll<Element>(target)];
		} else {
			const targetIsDocument = target instanceof Document;
			if (target instanceof Element || targetIsDocument || target instanceof Window) {
				elements = [targetIsDocument && normalizeDocument ? target.documentElement : target]
			} else {
				elements = target instanceof Array || target instanceof NodeList ? [...target] : [target];
			}
		}

		return elements.filter((element) => element !== null);
	}
}
