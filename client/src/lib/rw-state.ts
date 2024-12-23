type Prop<TKey extends string, T> = { [P in TKey]: T };

export type RWState<TKey extends string, T> = Prop<TKey, T> &
  Prop<`set${Capitalize<TKey>}`, React.Dispatch<React.SetStateAction<T>>>;

export type NativeRWState<TKey extends string, T> = Prop<TKey, T> &
  Prop<`set${Capitalize<TKey>}`, (value: T) => void>;
