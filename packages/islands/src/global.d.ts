import type islands from '.';

declare global {
	interface Window {
		Islands: typeof islands
		$i: typeof islands
	}
}
