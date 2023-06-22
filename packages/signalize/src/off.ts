import { normalizeTargets } from '.';

export const off = (type: string, element, listener, options = {}) => {
	const events = type.split(',');
	const elements = normalizeTargets(element);

	for (const event of events) {
		for (const element of elements) {
			element.removeEventListener(event, listener, options);
		}
	}
}
