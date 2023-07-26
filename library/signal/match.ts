import type { SignalReadable } from "../signal/index"
import { createSignalReadable, isSignalReadable } from "../signal/index"
import type { Excludable } from "../utils/type"

type FromTypeString<T> = T extends "string"
	? string
	: T extends "number"
	? number
	: T extends "bigint"
	? bigint
	: T extends "boolean"
	? boolean
	: T extends "symbol"
	? symbol
	: T extends "undefined"
	? undefined
	: T extends "object"
	? object
	: T extends "function"
	? Function
	: unknown

type ToTypeString<T> = T extends string
	? "string"
	: T extends number
	? "number"
	: T extends bigint
	? "bigint"
	: T extends boolean
	? "boolean"
	: T extends symbol
	? "symbol"
	: T extends undefined
	? "undefined"
	: T extends object
	? "object"
	: T extends Function
	? "function"
	: "unknown"

const EqualOfSymbol = Symbol()
type EqualOfSymbol = typeof EqualOfSymbol
const InstanceOfSymbol = Symbol()
type InstanceOfSymbol = typeof InstanceOfSymbol
const TypeOfSymbol = Symbol()
type TypeOfSymbol = typeof TypeOfSymbol

type CaseType = EqualOfSymbol | TypeOfSymbol | InstanceOfSymbol

type CaseChunk = { type: CaseType; map: Map<unknown, Then<unknown>> }

type Then<T> = (value: T) => unknown
type Match<TValue, TReturns = unknown> = {
	case<TCase extends TValue, TThen extends Then<TCase>>(
		value: TCase,
		then: TThen
	): Match<Excludable<TCase, Exclude<TValue, TCase>, TValue>, TReturns | ReturnType<TThen>>
	caseTypeOf<TCaseTypeOf extends ToTypeString<TValue>, TThen extends Then<FromTypeString<TCaseTypeOf>>>(
		value: TCaseTypeOf,
		then: TThen
	): Match<Exclude<TValue, FromTypeString<TCaseTypeOf>>, TReturns | ReturnType<TThen>>
	caseInstanceOf<TCaseInstanceOf extends { new (...args: any): any }, TThen extends Then<InstanceType<TCaseInstanceOf>>>(
		value: TCaseInstanceOf,
		then: TThen
	): Match<Exclude<TValue, InstanceType<TCaseInstanceOf>>, TReturns | ReturnType<TThen>>
	default<TDefault extends Then<TValue>>(
		fallback: [TValue] extends [never] ? void : TDefault
	): TReturns | ([TValue] extends [never] ? never : ReturnType<TDefault>)
}

function switchValue<T>(value: T): Match<T> {
	let _caseChunks: CaseChunk[] = []

	function addCase(type: CaseType, value: unknown, then: Then<unknown>) {
		const last = _caseChunks.length ? _caseChunks[_caseChunks.length - 1] : null

		if (last && last.type === type) last.map.set(value, then)
		else
			_caseChunks.push({
				type,
				map: new Map([[value, then]]),
			})
	}

	return {
		case(value, then) {
			addCase(EqualOfSymbol, value, then as Then<unknown>)
			return this
		},
		caseTypeOf(typeOf, then) {
			addCase(TypeOfSymbol, typeOf, then as Then<unknown>)
			return this
		},
		caseInstanceOf(instanceOf, then) {
			addCase(InstanceOfSymbol, instanceOf, then as Then<unknown>)
			return this
		},
		default(fallback: Then<T> | void) {
			const fallbackCase = fallback ?? null
			const caseChunks = _caseChunks
			_caseChunks = []

			for (const caseChunk of caseChunks) {
				switch (caseChunk.type) {
					case EqualOfSymbol:
						{
							const then = caseChunk.map.get(value)
							if (then) return then(value)
						}
						break
					case InstanceOfSymbol:
						{
							const then = caseChunk.map.get((value as { new (): unknown })?.constructor)
							if (then) return then(value)
						}
						break
					case TypeOfSymbol:
						{
							const then = caseChunk.map.get(typeof value)
							if (then) return then(value)
						}
						break
				}
			}
			if (fallbackCase) return fallbackCase(value)
			return null
		},
	}
}

type MatchSignal<TValue, TReturns = never> = {
	case<TCase extends TValue, TThen extends Then<TCase>>(
		value: TCase,
		then: TThen
	): MatchSignal<Excludable<TCase, Exclude<TValue, TCase>, TValue>, TReturns | ReturnType<TThen>>
	caseTypeOf<TCaseTypeOf extends ToTypeString<TValue>, TThen extends Then<FromTypeString<TCaseTypeOf>>>(
		value: TCaseTypeOf,
		then: TThen
	): MatchSignal<Exclude<TValue, FromTypeString<TCaseTypeOf>>, TReturns | ReturnType<TThen>>
	caseInstanceOf<TCaseInstanceOf extends { new (...args: any): any }, TThen extends Then<InstanceType<TCaseInstanceOf>>>(
		value: TCaseInstanceOf,
		then: TThen
	): MatchSignal<Exclude<TValue, InstanceType<TCaseInstanceOf>>, TReturns | ReturnType<TThen>>
	default<TDefault extends Then<SignalReadable<TValue>>>(
		fallback: [TValue] extends [never] ? void : TDefault
	): SignalReadable<TReturns | ([TValue] extends [never] ? never : ReturnType<TDefault>)>
}

function switchSignal<T>(value: SignalReadable<T>): MatchSignal<T> {
	let _caseChunks: CaseChunk[] = []

	function addCase(type: CaseType, value: unknown, then: Then<unknown>) {
		const last = _caseChunks.length ? _caseChunks[_caseChunks.length - 1] : null

		if (last && last.type === type) last.map.set(value, then)
		else
			_caseChunks.push({
				type,
				map: new Map([[value, then]]),
			})
	}

	return {
		case(value, then) {
			addCase(EqualOfSymbol, value, then as Then<unknown>)
			return this
		},
		caseInstanceOf(instanceOf, then) {
			addCase(InstanceOfSymbol, instanceOf, then as Then<unknown>)
			return this
		},
		caseTypeOf(typeOf, then) {
			addCase(TypeOfSymbol, typeOf, then as Then<unknown>)
			return this
		},
		default(fallback) {
			const fallbackCase = fallback ?? null
			const caseChunks = _caseChunks
			_caseChunks = []

			return createSignalReadable<unknown>((set) => {
				let isCurrentFallback: boolean
				return value.subscribe(
					(signalValue) => {
						isCurrentFallback = false

						for (const caseChunk of caseChunks) {
							switch (caseChunk.type) {
								case EqualOfSymbol:
									{
										const then = caseChunk.map.get(signalValue)
										if (then) return set(then(signalValue))
									}
									break
								case InstanceOfSymbol:
									{
										const then = caseChunk.map.get((signalValue as { new (): unknown })?.constructor)
										if (then) return set(then(signalValue))
									}
									break
								case TypeOfSymbol:
									{
										const then = caseChunk.map.get(typeof signalValue)
										if (then) return set(then(signalValue))
									}
									break
							}
						}

						if (fallbackCase) {
							if (!isCurrentFallback) set(fallbackCase(value))
						} else set(null)

						isCurrentFallback = true
					},
					{ mode: "immediate" }
				).unsubscribe
			}) as never
		},
	}
}

export const createMatch: {
	<T>(value: SignalReadable<T>): MatchSignal<T>
	<T>(value: T): Match<T>
} = <T>(value: T | SignalReadable<T>) => {
	if (isSignalReadable(value)) return switchSignal(value) as never
	return switchValue(value) as never
}
