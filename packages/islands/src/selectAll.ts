export const selectAll = <T extends HTMLElement>(selector: string, root = document.documentElement): NodeListOf<T> => {
	return root.querySelectorAll<T>(selector);
}
