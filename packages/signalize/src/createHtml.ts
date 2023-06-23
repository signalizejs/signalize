export const createHtml = (html: string): Document => {
	return (new DOMParser()).parseFromString(html, 'text/html');
}
