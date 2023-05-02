import { bind, Signal  } from ".";

export function h(tagName: string, attrs: Record<string, string|typeof Signal>, ...children) {
	const el = document.createElement(tagName);

	if (Object.keys(attrs)) {
		bind(el, attrs);
	}

	const normalizeChild = (child) => {
		const childArray = Array.isArray(child) ? child : [child];
		return childArray.map((childArrayItem) => {
			return childArrayItem instanceof Element || childArrayItem instanceof Node
				? childArrayItem
				: document.createTextNode(child);
		});
	}

	children = children.flat(Infinity);

	for (const child of children) {

		if (child instanceof Signal) {
			let currentAttachedChildren = normalizeChild(child.get());

			for (const currentAttachedChild of currentAttachedChildren) {
				el.appendChild(currentAttachedChild);
			}

			child.watch(({ newValue }) => {
				const newNormalizedChildren = normalizeChild(newValue);
				for (let i = 0; i < newNormalizedChildren.length; i++) {
					const oldChildren = currentAttachedChildren[i] ?? undefined;

					if (oldChildren) {
						oldChildren.parentElement?.replaceChild(newNormalizedChildren[i], oldChildren);

					} else {
						const lastItem = currentAttachedChildren[currentAttachedChildren.length - 1];
						const lastItemNextSibling = lastItem?.nextSibling ?? lastItem?.nextElementSibling;

						for (const newNormalizedChild of newNormalizedChildren) {
							if (lastItemNextSibling !== undefined) {
								el.insertBefore(newNormalizedChild, lastItemNextSibling);
							} else {
								el.appendChild(newNormalizedChild);
							}
						}
					}
				}
				if (currentAttachedChildren.length > newNormalizedChildren.length) {
					for (let i = currentAttachedChildren.length; i > newNormalizedChildren.length; i--) {
						currentAttachedChildren[i].parentElement?.removeChild(currentAttachedChildren[i]);
					}
				}

				currentAttachedChildren = newNormalizedChildren;
			});
		} else {
			const normalizedChildArray = normalizeChild(child);
			for (const normalizedChild of normalizedChildArray) {
				el.appendChild(normalizedChild);
			}
		}
	}

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
