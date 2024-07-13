/* eslint-disable @typescript-eslint/no-explicit-any */
type Callable = (...args: any[]) => any;

class CatchBlock<TTry extends Callable> {
  constructor(
    private fn: TTry,
    private args: Parameters<TTry>
  ) {}

  CatchFn<TCatch extends Callable>(
    fn: TCatch,
    ...args: Parameters<TCatch>
  ): ReturnType<TTry> | ReturnType<TCatch> {
    try {
      return this.fn(...this.args);
    } catch (e) {
      return fn(...args);
    }
  }

  CatchValue<T>(value: T): ReturnType<TTry> | T {
    try {
      return this.fn(...this.args);
    } catch (e) {
      return value;
    }
  }
}

export class ExceptionTrap {
  static Try<T extends Callable>(fn: T, ...args: Parameters<T>) {
    return new CatchBlock(fn, args);
  }
}

type AsyncCallable = (...args: any[]) => Promise<any>;

class AsyncCatchBlock<TTry extends AsyncCallable> {
  constructor(
    private fn: TTry,
    private args: Parameters<TTry>
  ) {}

  async CatchFn<TCatch extends AsyncCallable>(
    fn: TCatch,
    ...args: Parameters<TCatch>
  ): Promise<ReturnType<TTry> | ReturnType<TCatch>> {
    try {
      return await this.fn(...this.args);
    } catch (e) {
      return await fn(...args);
    }
  }

  async CatchValue<T>(value: T): Promise<ReturnType<TTry> | T> {
    try {
      return await this.fn(...this.args);
    } catch (e) {
      return await value;
    }
  }
}

export class AsyncExceptionTrap {
  static Try<T extends AsyncCallable>(fn: T, ...args: Parameters<T>) {
    return new AsyncCatchBlock(fn, args);
  }
}
