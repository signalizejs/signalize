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

export const render = ({ template, data, target } = { }) => {
	const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
	let rendered = targetElement.hasAttribute('data-rendered');

	if (targetElement.hasAttribute('data-rendered')) {
		return;
	}


	const templateData = new Proxy(data, {
		get: (target, key) => {
			const targetData = target[key];

			if (!rendered && targetData.constructor.name === 'Signal') {
				targetData.watch(() => redraw());
			}

			return targetData;
		}
	});

	const redraw = () => {
		const templateHtml = template(templateData);
		const templateDom = html`${templateHtml}`;
/* 		console.log(templateDom.children.length);
		console.log(templateDom.innerHTML); */
		syncChildren(templateDom.children, targetElement.children, target);
		//targetElement.innerHTML = templateHtml;
	};

	redraw();

	targetElement.setAttribute('data-rendered', '');
	rendered = true;
}

const syncElements = (newEl, oldEl) => {
	// Copy the attributes from the new element to the old element
	for (let i = 0; i < newEl.attributes.length; i++) {
	  const attr = newEl.attributes[i];
	  oldEl.setAttribute(attr.name, attr.value);
	}

	// Update the text content of the old element to match the new element
	if (newEl.textContent !== oldEl.textContent) {
	  oldEl.textContent = newEl.textContent;
	}

	syncChildren(newEl.children, oldEl.children, oldEl);
}

const syncChildren = (newChildren, oldChildren, oldEl) => {
	const len = Math.max(newChildren.length, oldChildren.length);
	for (let i = 0; i < len; i++) {

	  const newChild = newChildren[i];
	  const oldChild = oldChildren[i];

	  if ((!newChild || !oldChild) && typeof oldEl.childNodes !== 'undefined') {
		// If one of the child elements doesn't exist, remove it from the DOM
		if (newChild) {
		  oldEl.removeChild(oldEl.childNodes[i]);
		} else if (oldChild) {
		  oldEl.removeChild(oldChild);
		}
	  } else {
		// If both child elements exist, recursively sync them
		syncElements(newChild, oldChild);
	  }
	}
}
