type Prop<TKey extends string, T> = { [P in TKey]: T };

export type Context<TKey extends string, T> =
    Prop<TKey, T> &
    Prop<`set${Capitalize<TKey>}`, React.Dispatch<React.SetStateAction<T>>>;
