export const select = <T extends HTMLElement>(selector: string, root: string | HTMLElement = document.documentElement): T | null => {
	if (typeof root === 'string') {
		console.log(root);
		root = document.querySelector(root) as HTMLElement;

		if (root === null) {
			throw new Error(`Signalize: Root element ${root as string} not found.`);
		}
	}

	return root.querySelector(selector);
}
