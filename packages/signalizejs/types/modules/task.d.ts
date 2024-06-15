/**
 * A small helper for breaking long running tasks.
 *
 * https://nitropack.io/blog/post/improve-interaction-to-next-paint-inp
 * https://web.dev/optimize-long-tasks/
 */
export type task = (callback: CallableFunction) => void;

export interface TaskModule {
	task: task
}
