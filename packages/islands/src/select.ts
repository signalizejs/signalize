export const select = <T extends HTMLElement>(selector: string, root = document.documentElement): T | null => {
	return root.querySelector<T>(selector);
}
