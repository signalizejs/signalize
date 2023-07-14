export const selectAll = <T extends HTMLElement>(selector: string, root: string | HTMLElement = document.documentElement): NodeListOf<T> => {
	if (typeof root === 'string') {
		root = document.querySelector(root) as HTMLElement;

		if (root === null) {
			throw new Error(`Signalize: Root element "${root as string}" not found.`);
		}
	}

	return root.querySelectorAll(selector);
}
