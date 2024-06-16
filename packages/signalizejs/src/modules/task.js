/** @type {import('../../types/Signalize').Module<import('../../types/modules/task').TaskModule>} */
export default () => {
	const deadlineInterval = 50;

	/** @type {CallableFunction[]} */
	const tasks = [];

	/** @returns {Promise<void>} */
	const yieldToMain = async () => {
		await new Promise((resolve) => window.setTimeout(resolve, 0));
	};

	let processing = false;

	return {
		/** @type {import('../../types/modules/task').task} */
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
