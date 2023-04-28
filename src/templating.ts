const html = (string) => {
	const nodes = new DOMParser().parseFromString(string, 'application/xhtml+xml').childNodes;
	console.log(nodes);
	return nodes;
};

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
