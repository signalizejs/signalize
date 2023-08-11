// https://web.dev/optimize-long-tasks/

let tasksQueue: CallableFunction[] = [];
let processingTasks = false;

const yieldToMain = async (): Promise<void> => {
	await new Promise(resolve => {
		setTimeout(resolve, 0);
	})
}

const processTasks = async (): Promise<void> => {
	if (processingTasks) {
		return;
	}

	processingTasks = true;

	let deadline = performance.now() + 50;

	while (tasksQueue.length > 0) {
		if (navigator.scheduling?.isInputPending() || performance.now() >= deadline) {
			// There's a pending user input, or the
			// deadline has been reached. Yield here:
			await yieldToMain();

			// Extend the deadline:
			deadline = performance.now() + 50;

			// Stop the execution of the current loop and
			// move onto the next iteration:
			continue;
		}

		// Shift the task out of the queue:
		const task = tasksQueue.shift();

		// Run the task:
		task();
	}

	processingTasks = false;
}

export const task = (task: CallableFunction | CallableFunction[]): void => {
	tasksQueue = [
		...tasksQueue,
		...Array.isArray(task) ? task : [task]
	];

	void processTasks();
}
