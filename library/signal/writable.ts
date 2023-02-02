import { SignalReadable } from "./readable"
export interface SignalChanger<T> { (value: T): void }

export function createWritable<T>(...params: ConstructorParameters<typeof SignalWritable<T>>)
{
    return new SignalWritable<T>(...params)
}


export class SignalWritable<T> extends SignalReadable<T>
{
    protected static readonly Empty = Symbol('empty')

    public override get value() { return super.value }
    public override set value(value: T) { this.set(value) }

    public set(value: T | typeof SignalWritable.Empty = SignalWritable.Empty)
    {
        if (value === this._value && typeof value !== 'object') return
        if (value !== SignalWritable.Empty) this._value = value
        this.signal()
    }

    public change(changer: SignalChanger<T>)
    {
        changer(this._value)
        this.signal()
    }
}