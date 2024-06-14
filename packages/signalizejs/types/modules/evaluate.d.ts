import type { Signal } from "../../types/modules/signal"

export type evaluate = (string: string, contect: Record<string, any>, trackSignals: boolean) => {
	result: any,
	detectedSignals: Signal<any>[]
}
