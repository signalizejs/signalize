import type Signalize from '..';

declare module '..' {
	interface Signalize {
		select: <T extends HTMLElement>(selector: string, root?: string | HTMLElement) => T | null
		selectAll: <T extends HTMLElement>(selector: string, root?: string | HTMLElement) => NodeListOf<T>
	}
}

export default (signalize: Signalize): void => {
	const { config } = signalize;

	signalize.select = <T extends HTMLElement>(selector: string, root: string | HTMLElement = config.root): T | null => {
		if (typeof root === 'string') {
			root = config.root.querySelector(root) as HTMLElement;

			if (root === null) {
				throw new Error(`Signalize: Root element "${root as string}" not found.`);
			}
		}

		return root.querySelector(selector);
	}

	signalize.selectAll = <T extends HTMLElement>(selector: string, root: string | HTMLElement = config.root): NodeListOf<T> => {
		if (typeof root === 'string') {
			root = config.root.querySelector(root) as HTMLElement;

			if (root === null) {
				throw new Error(`Signalize: Root element "${root as string}" not found.`);
			}
		}
		return root.querySelectorAll(selector);
	}
}
