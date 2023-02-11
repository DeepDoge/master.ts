import { readable, SignalReadable, SignalSubscription } from "./readable"

export interface SignalDeriveDependencyAdder {
	<T extends SignalReadable>(signal: T): T
}
export interface SignalDeriver<T> {
	(addDependency: SignalDeriveDependencyAdder): T
}

export function derive<T>(deriver: SignalDeriver<T>): SignalReadable<T> {
	const dependencies = new Set<SignalReadable>()
	const dependencySubscriptions: SignalSubscription[] = []

	return readable<T>(
		deriver((v) => v),
		(set) => {
			function addDependency<T extends SignalReadable>(signal: T): T {
				if (dependencies.has(signal)) return signal
				dependencies.add(signal)
				dependencySubscriptions.push(signal.subscribe(() => update()))
				return signal
			}

			function update() {
				const value = deriver(addDependency)
				set(value)
			}

			{
				let i = 0
				for (const dependency of dependencies) dependencySubscriptions[i++] = dependency.subscribe(() => update())
			}
			update()

			return () => dependencySubscriptions.forEach((subscription) => subscription.unsubscribe())
		}
	)
}

const deriveOfFunctionCache = new WeakMap<SignalDeriver<unknown>, SignalReadable<any>>()
/**
 * Same as createDerive, but specialized for functions.
 *
 * Derives a signal from a function.
 *
 * Cache is used to ensure that the same signal is returned for the same function.
 *
 * Used internally to convert functions in html to derived signals.
 * @param func The function that derives the value of the signal.
 * @returns The signal that is derived from the function.
 * @example
 * const double = m.deriveFromFunction((s) => s(foo).value * 2)
 **/
export function createOrGetDeriveOfFunction<T>(func: SignalDeriver<T>): SignalReadable<T> {
	if (deriveOfFunctionCache.has(func)) return deriveOfFunctionCache.get(func)!
	const computed = derive(func)
	deriveOfFunctionCache.set(func, computed)
	return computed
}