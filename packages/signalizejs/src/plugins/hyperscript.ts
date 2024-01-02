import type { Signalize, SignalizePlugin } from '..';
import type { Signal } from './signal';

declare module 'signalizejs' {
	interface Signalize {
		h: <T extends Element>(tagName: string, ...children: Array<HyperscriptChildAttrs | HyperscriptChild | HyperscriptChild[]>) => T
	}
}

type HyperscriptChild = string | number | Element | Node | Signal<any>;

type HyperscriptChildAttrs = Record<string, string | Signal>;

export default (): SignalizePlugin => {
	return ($: Signalize): void => {
		$.h = <T extends Element>(tagName: string, ...children: Array<HyperscriptChildAttrs | HyperscriptChild | HyperscriptChild[]>): T => {
			let attrs: HyperscriptChildAttrs = {};

			if (children[0]?.constructor?.name === 'Object') {
				attrs = children.shift() as HyperscriptChildAttrs;
			}

			children = children.flat(Infinity);

			const el = document.createElement(tagName);

			if (Object.keys(attrs).length > 0) {
				$.bind(el, attrs);
			}

			const normalizeChild = (child: string | number | Element | Node | Signal<any>): Array<Node | Element> => {
				const result: Array<Node | Element> = [];

				if (child instanceof Element || child instanceof Node) {
					result.push(child);
				} else if (child instanceof $.Signal) {
					result.push(...normalizeChild(child()));
					child.watch(({ newValue }) => {
						const newNormalizedChildren = normalizeChild(newValue);
						for (const newNormalizedChild of newNormalizedChildren) {
							const oldNormalizedChild = result.shift();
							if (oldNormalizedChild != null) {
								if (oldNormalizedChild !== newNormalizedChild) {
									el.replaceChild(newNormalizedChild, oldNormalizedChild);
								}
							} else {
								el.appendChild(newNormalizedChild);
							}
						}
						for (const oldNormalizedChild of result) {
							el.removeChild(oldNormalizedChild);
						}
						result.push(...newNormalizedChildren);
					});
				} else if (child instanceof Array) {
					for (const childItem of child) {
						result.push(...normalizeChild(childItem));
					}
				} else {
					result.push(document.createTextNode(String(child)));
				}

				return result;
			}

			const fragment = document.createDocumentFragment();

			for (const child of children) {
				fragment.append(...normalizeChild(child));
			}

			el.appendChild(fragment);

			return el as T
		}
	}
}
