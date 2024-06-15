import type { Signal } from "../../types/modules/signal"

export type evaluate = (string: string, content: Record<string, any>, trackSignals?: boolean) => {
	result: any,
	detectedSignals: Signal<any>[]
}

export interface EvaluateModule {
	evaluate: evaluate
}
