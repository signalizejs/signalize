export const normalizeTargets = (target: EventTarget, normalizeDocument = false): Array<HTMLElement | Document> => {
	let elements: Array<HTMLElement | Document>;

	if (typeof target === 'string') {
		elements = [...document.querySelectorAll<HTMLElement>(target)];
	} else {
		const targetIsDocument = target instanceof Document;
		if (target instanceof HTMLElement || targetIsDocument) {
			elements = [targetIsDocument && normalizeDocument ? target.documentElement : target]
		} else {
			elements = [...target];
		}
	}

	return elements;
}
