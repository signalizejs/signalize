import { bind, Signal } from ".";

type HypertextChild = string | number | Element | Node | typeof Signal<any>;

type HypertextChildAttrs = Record<string, string | typeof Signal>;

export const html = (strings: string[], ...values: any): DocumentFragment => {
	const templateString = String.raw({ raw: strings }, ...values);
	const template = document.createElement('template');
	template.innerHTML = templateString.trim();

	return template.content;
}


export const h = (tagName: string, ...children: (HypertextChildAttrs | HypertextChild | HypertextChild[])[]): Element => {
	let attrs: HypertextChildAttrs = {};

	if (children[0].constructor?.name === 'Object') {
		attrs = children.shift() as HypertextChildAttrs;
	}

	const el = document.createElement(tagName);

	if (Object.keys(attrs).length > 0) {
		bind(el, attrs);
	}

	const normalizeChild = (child: string | number | Element | Node | typeof Signal<any>) => {
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

/* const syncNodes = (element, newChildren) => {
	if (typeof newChildren === 'string') {
		newChildren = html(newChildren);
	}

	const oldChildren = element.childNodes;

	for (let i = 0; i < newChildren.length; i++) {
		const newChild = newChildren[i];
		const oldChild = oldChildren[i];

		if (oldChild === undefined) break;

		if (newChild.nodeType === Node.ELEMENT_NODE) {
			syncElements(newChild, oldChild);
		} else if (newChild.nodeType === Node.TEXT_NODE) {
			oldChild.textContent = newChild.textContent;
		}
	}

	while (oldChildren.length > newChildren.length) element.removeChild(oldChildren[oldChildren.length - 1]);

	for (let i = oldChildren.length; i < newChildren.length; i++) {
		element.appendChild(newChildren[i]);
	}
}

const syncElements = (newElement, oldElement) => {
	if (typeof newElement === 'string') {
		newElement = html(newElement);
	}

	console.log(newElement, oldElement);
	const oldAttrs = oldElement.attributes ?? [];
	const newAttrs = newElement.attributes ?? []

	for (let i = 0; i < newAttrs.length; i++) {
		const name = newAttrs[i].name;
		const value = newAttrs[i].value;

		if (!oldElement.hasAttribute(name)) {
			oldElement.setAttribute(name, value);
		   } else if (oldElement.getAttribute(name) !== value) {
			oldElement.setAttribute(name, value);
		   }
	}

	for (let i = 0; i < oldAttrs.length; i++) {
		const name = oldAttrs[i].name;
		if (!newElement.hasAttribute(name)) oldElement.removeAttribute(name);
	}

	syncNodes(oldElement, newElement.childNodes)
};
 */
