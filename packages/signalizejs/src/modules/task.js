// https://nitropack.io/blog/post/improve-interaction-to-next-paint-inp
// https://web.dev/optimize-long-tasks/

/**
 * @callback task
 * @param {Function} callback
 */

/** @type {import('../Signalize').SignalizeModule} */
export default () => {
	const deadlineInterval = 50;

	/** @type {CallableFunction[]} */
	const tasks = [];

	/**
	 * @returns {Promise<void>}
	 */
	const yieldToMain = async () => {
		await new Promise((resolve) => window.setTimeout(resolve, 0));
	};

	let processing = false;

	return {
		/** @type {task} */
		task: (callback) => {
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

					if (typeof callback !== 'function') {
						throw new Error('Task must be a callable function.');
					}

					callback();
				}
				processing = false;
			})();
		}
	};
};
