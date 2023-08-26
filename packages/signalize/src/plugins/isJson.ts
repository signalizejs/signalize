declare module '..' {
	interface Signalize {
		isJson: (content: any) => boolean
	}
}

export default (content: any): boolean => {
	try {
		JSON.parse(content);
	} catch (e) {
		return false;
	}
	return true;
}
