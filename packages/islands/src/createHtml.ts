export const createHtml = (html: string): DocumentFragment => {
	const template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content;
}
