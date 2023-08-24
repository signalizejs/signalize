export default (html: string): Document => (new DOMParser()).parseFromString(html, 'text/html');
