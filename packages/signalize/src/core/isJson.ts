export default (content: any): boolean => {
	try {
		JSON.parse(content);
	} catch (e) {
		return false;
	}
	return true;
}
