import type Signalize from '..'

declare module '..' {
	interface Signalize {
		merge: <T extends object>(...objects: T[]) => T
	}
}

export default ($: Signalize): void => {
	const merge = <T extends object>(...objects: T[]): T => {
		const mergedObject: T = {} as T;

		for (const objectToMerge of objects) {
			for (const [key, value] of Object.entries(objectToMerge)) {
				if (!(key in mergedObject)) {
					mergedObject[key] = value;
					continue;
				}

				const valueType = typeof value;

				if (Array.isArray(value)) {
					mergedObject[key] = [...mergedObject[key], ...value];
				} else if (value !== null && !(value instanceof Element) && !(value instanceof Document) && !(value instanceof DocumentFragment) && valueType === 'object') {
					mergedObject[key] = merge(mergedObject[key], value as T);
				} else {
					mergedObject[key] = value;
				}
			}
		}

		return mergedObject;
	}

	$.merge = merge;
}
