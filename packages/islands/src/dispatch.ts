export const dispatch = (eventName: string, eventData: any = undefined, target = document): void => {
	target.dispatchEvent(
		new window.CustomEvent(eventName, eventData === undefined ? eventData : { detail: eventData })
	);
};
