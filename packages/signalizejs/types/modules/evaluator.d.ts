import type { Signal } from "./signal"

export type evaluate = (string: string, content: Record<string, any>, trackSignals?: boolean) => {
	result: any,
	detectedSignals: Signal<any>[]
}

export interface EvaluatorModule {
	evaluate: evaluate
}
