import type Signalize from '..'

declare module '..' {
	interface Signalize {
		CallableClass: typeof CallableClass
	}
}

class CallableClass extends Function {
	constructor () {
		super();
		return new Proxy(this, {
			get: this.get,
			set: this.set,
			apply: this.apply
		})
	}

	get<T>(): T { return undefined as T }
	set (): boolean { return true }
	apply<T>(): T { return undefined as T }
}

export default (signalize: Signalize): void => {
	signalize.CallableClass = CallableClass;
}
