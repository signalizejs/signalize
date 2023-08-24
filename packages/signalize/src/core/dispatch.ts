export default (eventName: string, eventData: any = undefined, target = document): boolean => {
	return target.dispatchEvent(
		new window.CustomEvent(eventName, {
			detail: eventData,
			cancelable: true,
			bubbles: true
		})
	);
};
