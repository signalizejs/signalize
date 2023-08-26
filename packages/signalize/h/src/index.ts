import Signalize, { bind, Signal } from 'signalizejs';

type HypertextChild = string | number | Element | Node | typeof Signal<any>;

type HypertextChildAttrs = Record<string, string | typeof Signal>;

export default (signalize: Signalize) => {

}

const renderDom = (
	tagName: string,
	attrs: Record<string, any>,
	children: Array<HypertextChildAttrs | HypertextChild | HypertextChild[]>
): HTMLElement => {
	const el = document.createElement(tagName);

	if (Object.keys(attrs).length > 0) {
		bind(el, attrs);
	}

	const normalizeChild = (child: string | number | Element | Node | Signal<any>): Array<Node | Element> => {
		const result: Array<Node | Element> = [];

		if (child instanceof Element || child instanceof Node) {
			result.push(child);
		} else if (child instanceof Signal) {
			result.push(...normalizeChild(child.get()));
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

	return el;
}

const renderHtmlString = (tagName: string, attrs: Record<string, any>, children: string[]): string => {
	let html = `<${tagName}`;

	for (const [key, value] of Object.entries(attrs)) {
		html += ` ${key}="${value}"`;
	}

	html += children.length > 0 ? `>${children.join('')}</${tagName}>` : '>';

	return html;
}

export const h = <T extends HTMLElement>(tagName: string, ...children: Array<HypertextChildAttrs | HypertextChild | HypertextChild[]>): T => {
	let attrs: HypertextChildAttrs = {};

	if (children[0]?.constructor?.name === 'Object') {
		attrs = children.shift() as HypertextChildAttrs;
	}

	children = children.flat(Infinity);

	return (
		typeof window !== 'undefined'
			? renderDom(tagName, attrs, children)
			: renderHtmlString(tagName, attrs, children as string[])
	) as T
}

Signalize.h = h;
