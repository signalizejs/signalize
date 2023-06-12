import { bind, Signal } from "./core";

type HypertextChild = string | number | Element | Node | typeof Signal<any>;

type HypertextChildAttrs = Record<string, string | typeof Signal>;

export const h = (tagName: string, ...children: (HypertextChildAttrs | HypertextChild | HypertextChild[])[]): Element => {
	let attrs: HypertextChildAttrs = {};

	if (children[0].constructor?.name === 'Object') {
		attrs = children.shift() as HypertextChildAttrs;
	}

	const el = document.createElement(tagName);

	if (Object.keys(attrs).length > 0) {
		bind(el, attrs);
	}

	const normalizeChild = (child: string | number | Element | Node | Signal<any>) => {
		const result: (Node|Element)[] = [];

		if (child instanceof Element || child instanceof Node) {
			result.push(child);
		} else if (child instanceof Signal) {
			result.push(...normalizeChild(child.get()));
			child.watch(({ newValue }) => {
				const newNormalizedChildren = normalizeChild(newValue);
				for (const newNormalizedChild of newNormalizedChildren) {
					const oldNormalizedChild = result.shift();
					if (oldNormalizedChild) {
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

	children = children.flat(Infinity);

	const fragment = document.createDocumentFragment();

	for (const child of children) {
		fragment.append(...normalizeChild(child));
	}

	el.appendChild(fragment);

	return el;
}
