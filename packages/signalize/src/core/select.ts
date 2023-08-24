import type Signalize from '..';

export default (signalize: Signalize): void => {
	const { config } = signalize.config;

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
