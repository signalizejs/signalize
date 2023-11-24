// https://nitropack.io/blog/post/improve-interaction-to-next-paint-inp
// https://web.dev/optimize-long-tasks/

import type { Signalize } from '..';

declare global {
	interface Navigator {
		scheduling?: {
			isInputPending(): boolean;
		}
	}
}

declare module '..' {
	interface Signalize {
		task: (callback: CallableFunction) => void
	}
}

export type DomReady = (callback: CallableFunction) => void;

export default ($: Signalize): void => {
	const deadlineInterval = 50;

	const tasks: CallableFunction[] = [];

	const yieldToMain = async (): Promise<void> => {
		await new Promise((resolve) => window.setTimeout(resolve, 0));
	}

	let processing = false;

	$.task = (callback: CallableFunction): void => {
		tasks.push(callback);

		if (processing) {
			return;
		}

		processing = true;
		void (async () => {
			let deadline = window.performance.now() + deadlineInterval;

			while (tasks.length > 0) {
				if (window.performance.now() >= deadline || (
					typeof window.navigator.scheduling !== 'undefined' && window.navigator.scheduling.isInputPending()
				)) {
					await yieldToMain();
					deadline = window.performance.now() + deadlineInterval;
					continue;
				}

				const callback = tasks.shift();
				callback();
			}
			processing = false;
		})();
	};
};
