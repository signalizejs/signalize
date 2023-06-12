import type islands from './core';

declare global {
	interface Window {
		Islands: typeof islands,
		$i: typeof islands
	}
}
